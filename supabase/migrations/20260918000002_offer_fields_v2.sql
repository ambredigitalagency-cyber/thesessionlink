-- =============================================================================
-- Offer builder: custom_fields v2.
--
-- v1 stored each field flat — { id, key, label, type, value, unit, source } —
-- and pre-filled every category suggestion into every new offer. A select kept
-- the *label* of the chosen option ("In person"), so the options themselves
-- were only known through the category config.
--
-- v2 separates what the field is from what the pro filled in:
--
--   { "id": "f_…", "type": "select",
--     "definition": { "label": "Level", "options": [{ "id": "beginner", "label": "Beginner" }] },
--     "value": "beginner" }
--
-- Types: text (definition.multiline), number (definition.unit), select,
-- multiselect (definition.options), boolean, time (definition.mode = range |
-- duration), images. Order is the array order. The TypeScript schema in
-- src/lib/offers/fields.ts is the reference for the shape and its rules.
--
-- activity_categories.config.suggested_fields keeps its format: suggestions are
-- now offered one click at a time in the builder instead of pre-filled.
--
-- Conversion:
--   * text / textarea -> text (multiline for textarea, or when the value is
--     longer than a short text allows)
--   * number          -> number, unit moved into the definition
--   * images          -> images
--   * select          -> select; options rebuilt from the category suggestion
--     in the profile's language, value matched back from the stored label.
--     The lookup spans every category, not just the profile's own: a real
--     estate agent can perfectly well have kept a hairdressing offer from a
--     category they browsed earlier, and that offer deserves its full list of
--     options too. The profile's own category is tried first, and a template
--     whose options actually contain the stored value wins over one that
--     merely shares the key.
--     A label that matches no option at all becomes an option of its own, so
--     nothing the pro wrote is lost.
--   * fields left empty are dropped: they were imposed suggestions, not
--     something the pro chose to show.
-- =============================================================================

create function public.tmp_offer_field_v2(f jsonb, suggestions jsonb, loc text)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_type    text  := f->>'type';
  v_value   jsonb := f->'value';
  v_label   text  := left(coalesce(nullif(btrim(f->>'label'), ''), f->>'key', 'Detail'), 60);
  v_id      text  := left(regexp_replace(coalesce(f->>'id', ''), '[^A-Za-z0-9_-]', '_', 'g'), 40);
  v_text    text;
  v_template jsonb;
  v_options jsonb;
  v_chosen  text;
  v_match   text;
begin
  -- Already converted (the migration is safe to re-run on a row).
  if f ? 'definition' then
    return f;
  end if;

  if v_value is null
     or v_value = 'null'::jsonb
     or (jsonb_typeof(v_value) = 'string' and btrim(v_value #>> '{}') = '')
     or (jsonb_typeof(v_value) = 'array' and jsonb_array_length(v_value) = 0) then
    return null;
  end if;

  if v_id = '' then
    v_id := 'f_' || substr(md5(f::text), 1, 10);
  end if;

  if v_type in ('text', 'textarea') then
    v_text := left(btrim(v_value #>> '{}'), 2000);
    return jsonb_build_object(
      'id', v_id,
      'type', 'text',
      'definition', jsonb_build_object(
        'label', v_label,
        'multiline', v_type = 'textarea' or char_length(v_text) > 200
      ),
      'value', v_text
    );
  end if;

  if v_type = 'number' then
    if jsonb_typeof(v_value) <> 'number' then
      return null;
    end if;
    return jsonb_build_object(
      'id', v_id,
      'type', 'number',
      'definition', jsonb_build_object('label', v_label, 'unit', nullif(left(btrim(f->>'unit'), 16), '')),
      'value', v_value
    );
  end if;

  if v_type = 'images' then
    if jsonb_typeof(v_value) <> 'array' then
      return null;
    end if;
    return jsonb_build_object(
      'id', v_id,
      'type', 'images',
      'definition', jsonb_build_object('label', v_label),
      'value', v_value
    );
  end if;

  if v_type = 'select' then
    v_chosen := left(btrim(v_value #>> '{}'), 60);

    -- Candidates are ordered by the caller, the profile's own category first.
    -- Among them, prefer one whose options actually contain the stored value.
    select s into v_template
      from jsonb_array_elements(coalesce(suggestions, '[]'::jsonb)) with ordinality as x(s, ord)
     where s->>'key' = f->>'key'
       and s->>'type' = 'select'
       and exists (
         select 1
           from jsonb_array_elements(s->'options') o
          where o->>'value' = v_chosen
             or exists (select 1 from jsonb_each_text(o->'label') l where l.value = v_chosen)
       )
     order by ord
     limit 1;

    -- No list holds that value: fall back to the first list with the same key,
    -- so the pro still gets the real options alongside their own value.
    if v_template is null then
      select s into v_template
        from jsonb_array_elements(coalesce(suggestions, '[]'::jsonb)) with ordinality as x(s, ord)
       where s->>'key' = f->>'key' and s->>'type' = 'select'
       order by ord
       limit 1;
    end if;

    if v_template is not null then
      select jsonb_agg(
               jsonb_build_object(
                 'id', o->>'value',
                 'label', left(coalesce(o->'label'->>loc, o->'label'->>'en', o->>'value'), 60)
               ) order by ord)
        into v_options
        from jsonb_array_elements(v_template->'options') with ordinality as x(o, ord);

      -- v1 stored the option label, in whichever language the form was in.
      select o->>'value' into v_match
        from jsonb_array_elements(v_template->'options') o
       where o->>'value' = v_chosen
          or exists (select 1 from jsonb_each_text(o->'label') l where l.value = v_chosen)
       limit 1;
    end if;

    if v_match is null then
      v_options := coalesce(v_options, '[]'::jsonb)
        || jsonb_build_array(jsonb_build_object('id', 'legacy', 'label', v_chosen));
      v_match := 'legacy';
    end if;

    return jsonb_build_object(
      'id', v_id,
      'type', 'select',
      'definition', jsonb_build_object('label', v_label, 'options', v_options),
      'value', v_match
    );
  end if;

  return null;
end;
$$;

update public.offers o
   set custom_fields = coalesce((
         select jsonb_agg(converted order by ord)
           from jsonb_array_elements(o.custom_fields) with ordinality as e(f, ord)
           cross join lateral (
             select public.tmp_offer_field_v2(
                      e.f,
                      candidates.fields,
                      coalesce(p.locale, 'en')
                    ) as converted
           ) c2
          where converted is not null
       ), '[]'::jsonb)
  from public.profiles p
  cross join lateral (
         -- Every category's suggestions, the profile's own first.
         select coalesce(
                  jsonb_agg(entry.field order by (c.id = p.category_id) desc, c.position, entry.ord),
                  '[]'::jsonb
                ) as fields
           from public.activity_categories c
           cross join lateral jsonb_array_elements(
                  coalesce(c.config->'suggested_fields', '[]'::jsonb)
                ) with ordinality as entry(field, ord)
       ) candidates
 where p.id = o.profile_id
   and jsonb_array_length(o.custom_fields) > 0;

drop function public.tmp_offer_field_v2(jsonb, jsonb, text);

comment on column public.offers.custom_fields is
  'Free-form offer details, v2: [{ id, type, definition, value }] in display order. '
  'Shape and rules live in src/lib/offers/fields.ts.';

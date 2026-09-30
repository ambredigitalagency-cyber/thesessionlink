-- -----------------------------------------------------------------------------
-- The legal pages are app routes now: /cgu, /confidentialite and
-- /mentions-legales in French, /terms, /privacy and /legal in English (those
-- three were already reserved). No coach may take the French ones as a slug.
-- Same list as before, three words longer.
-- -----------------------------------------------------------------------------
create or replace function public.is_reserved_slug(p_slug text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(p_slug) = any (array[
    'about','account','admin','api','app','auth','billing','blog','booking','bookings',
    'contact','dashboard','docs','explore','faq','features','for','help','home','legal',
    'login','logout','new','onboarding','pricing','privacy','profile','register','root',
    'settings','signin','signout','signup','static','status','support','terms','www',
    'mail','email','team','thesessionlink','_next','favicon.ico','robots.txt','sitemap.xml',
    'waitlist','cgu','confidentialite','mentions-legales'
  ]);
$$;

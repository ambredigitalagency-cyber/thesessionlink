import { parseActionConfig } from "@/lib/offers/schema";
import { fieldErrorsFrom, offerInputSchema } from "@/lib/validation";

/**
 * Validates an offer payload and normalises action_config. Shared by the
 * coach's own offer actions and the console's interventions, so an admin edit
 * obeys exactly the rules the coach's form does. main_photo_url is not part
 * of the input: a trigger derives it from photos[0].
 */
export function prepareOffer(input: unknown) {
  const parsed = offerInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: "invalid_input" as const,
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const { action_config, price, price_type, photos, ...rest } = parsed.data;

  // "free" and "on_request" never carry an amount.
  const amount = price_type === "free" || price_type === "on_request" ? null : price;

  return {
    ok: true as const,
    values: {
      ...rest,
      photos,
      price_type,
      price: amount,
      action_config: parseActionConfig(parsed.data.action_type, action_config),
    },
  };
}

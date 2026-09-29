import { acceptsAddons } from "@/lib/offers/addons";
import { parseActionConfig } from "@/lib/offers/schema";
import { offerIsPayable } from "@/lib/payments/amount";
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

  const { action_config, price, price_type, photos, addons, ...rest } = parsed.data;

  // "free" and "on_request" never carry an amount.
  const amount = price_type === "free" || price_type === "on_request" ? null : price;
  const config = parseActionConfig(parsed.data.action_type, action_config);

  // Online payment needs a firm amount to charge. The form already refuses to
  // switch it on without one, but a price edited afterwards — or a payload
  // that never went through the form — must not leave an offer asking clients
  // to pay a figure nobody agreed on.
  if (
    "online_payment" in config &&
    config.online_payment !== "off" &&
    !offerIsPayable({ price: amount, price_type })
  ) {
    config.online_payment = "off";
  }

  return {
    ok: true as const,
    values: {
      ...rest,
      photos,
      price_type,
      price: amount,
      action_config: config,
      // Extras only mean something where there is a price to add them to.
      addons: acceptsAddons(parsed.data.action_type) ? addons : [],
    },
  };
}

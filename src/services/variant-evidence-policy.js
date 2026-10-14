// A single product policy for evidence from item variations.
// Number changes test stability; reading-form changes test transfer.
export const CONTROLLED_NUMBER_VARIANT_LEVELS = Object.freeze(["change_one_number", "change_two_numbers"]);

export const READING_FORM_TRANSFER_VARIANT_LEVELS = Object.freeze([
  "context_change",
  "relationship_reframe",
  "question_order_variant",
]);

export function isControlledNumberVariant(variantLevel) {
  return CONTROLLED_NUMBER_VARIANT_LEVELS.includes(variantLevel);
}

export function isReadingFormTransferVariant(variantLevel) {
  return READING_FORM_TRANSFER_VARIANT_LEVELS.includes(variantLevel);
}

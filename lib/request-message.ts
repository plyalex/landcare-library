import { firstName, formatDate } from "./dates";

/** The pre-filled message sent with a borrow request */
export function defaultRequestMessage(opts: {
  ownerName: string;
  myName: string;
  title: string;
  authors: string[];
  pickupDate: string;
}): string {
  const by = opts.authors.length ? ` by ${opts.authors.join(", ")}` : "";
  return [
    `Hi ${firstName(opts.ownerName)},`,
    `I'd like to borrow "${opts.title}"${by}. I could pick it up on ${formatDate(opts.pickupDate, "weekday")}. Does that suit you?`,
    `Thanks,\n${firstName(opts.myName)}`,
  ].join("\n\n");
}

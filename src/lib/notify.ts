// Outbound messages to bidders and consignors.
//
// NOTIFY_PROVIDER=console (default) logs messages, which is enough for local work
// and the pilot. Add a WhatsApp Business Platform provider before public launch:
// business-initiated WhatsApp messages must use pre-approved templates
// (otp, outbid, ending_soon, won, payment_received, payout_sent), with SMS as fallback.

export interface Notifier {
  send(phone: string, message: string): Promise<void>;
}

const consoleNotifier: Notifier = {
  async send(phone, message) {
    console.log(`[notify → ${phone}] ${message}`);
  },
};

export function notifier(): Notifier {
  const provider = process.env.NOTIFY_PROVIDER ?? "console";
  if (provider === "console") return consoleNotifier;
  throw new Error(`Unknown NOTIFY_PROVIDER: ${provider}`);
}

// Render-side view of the stored content. Re-exports the assembled ReportContent
// and the headline blob that travels inside it under `_headline`.

export type { ReportContent, MatchedPropertyView, AreaView, TopThreeItem } from "./types";

export interface HeadlineBlob {
  subject: string;
  preheader: string;
  headline: string;
  whatsappOpener: string;
}

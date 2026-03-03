import type { PolicyMetadata } from "./types";

/**
 * Policy metadata for Semantic Layer Agent: ensures Policy Evaluation Agent
 * infers policies correctly by providing definitions and clause semantics.
 */
export const policyMetadataStore: Record<string, PolicyMetadata> = {
  "pol-termination": {
    policyId: "pol-termination",
    policyName: "Employee Termination Policy",
    effectiveDate: "2024-01-01",
    definitions: {
      restricted_zone:
        "Designated areas where confidential or proprietary work is conducted; no personal devices (phones, cameras, smartwatches) permitted. Examples: B-200 series rooms, confidential meeting rooms.",
      personal_device: "Phones, cameras, smartwatches, or any device capable of recording or transmitting.",
      severe_breach: "Photography or recording of documents, screens, or whiteboards containing confidential/proprietary information, or intentional transmission of such material.",
      first_offense_minor: "First violation of device-in-restricted-zone without evidence of photography/recording.",
      second_offense: "Any repeat violation after a prior written warning for the same policy.",
    },
    clauses: [
      {
        id: "restricted-area-device",
        name: "No personal devices in restricted zones",
        description: "No personal devices (phones, cameras, smartwatches) are permitted in designated restricted zones.",
        severityLevel: "first_offense_minor",
        howToInferFromSnapshot:
          "Check case notes and initial finding for: device usage in restricted area, witness or security footage of phone/camera in zone. Prior cases on snapshot indicate repeat offense.",
        rehireEligibilityRule: "First offense minor: eligible after 12 months. Second offense: case-by-case.",
      },
      {
        id: "restricted-area-photography",
        name: "No photography/recording of confidential information",
        description: "Photography, recording, or transmission of confidential/proprietary information is strictly prohibited.",
        severityLevel: "first_offense_severe",
        howToInferFromSnapshot:
          "Check case notes and initial finding for: photography, recording, or transmission of documents/screens/whiteboards. Security or witness evidence of camera use pointed at confidential content.",
        rehireEligibilityRule: "Severe breach: typically not eligible for rehire.",
      },
      {
        id: "restricted-area-second-offense",
        name: "Second offense (device or photography)",
        description: "Second violation of restricted area policy after prior written warning.",
        severityLevel: "second_offense",
        howToInferFromSnapshot:
          "Check employee snapshot cases for prior warning or prior case with same policy. If initial finding references 'second offense' or 'prior warning', this clause applies.",
        rehireEligibilityRule: "Eligible after 12 months unless severe.",
      },
    ],
  },
};

export function getPolicyMetadata(policyId: string): PolicyMetadata | null {
  return policyMetadataStore[policyId] ?? null;
}

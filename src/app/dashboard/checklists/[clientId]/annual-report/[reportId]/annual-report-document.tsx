import {
  formatReportRating,
  getReportRating,
} from "@/app/dashboard/checklists/report-rating";
import type {
  AnnualReport,
  AnnualReportObjective,
  Client,
  Location,
} from "@/types/db";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

type AnnualReportDocumentProps = {
  report: AnnualReport;
  objectives: AnnualReportObjective[];
  client: Client;
  location: Location | null;
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    color: "#1a1a1a",
    fontFamily: "Helvetica",
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 12,
  },
  headerField: {
    marginBottom: 3,
  },
  headerLabel: {
    fontFamily: "Helvetica-Bold",
  },
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    borderBottom: "1pt solid #cccccc",
    paddingBottom: 4,
  },
  paragraph: {
    lineHeight: 1.5,
  },
  objectiveBlock: {
    marginBottom: 12,
  },
  objectiveTitle: {
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  objectiveRating: {
    marginBottom: 2,
    color: "#333333",
  },
  emptyState: {
    color: "#666666",
    fontStyle: "italic",
  },
  signatureTable: {
    marginTop: 6,
  },
  signatureHeaderRow: {
    flexDirection: "row",
    borderBottom: "1pt solid #1a1a1a",
    paddingBottom: 4,
    marginBottom: 4,
  },
  signatureRow: {
    flexDirection: "row",
    borderBottom: "1pt solid #cccccc",
    paddingVertical: 10,
  },
  signatureHeaderCell: {
    fontFamily: "Helvetica-Bold",
  },
  colName: { width: "28%" },
  colRole: { width: "20%" },
  colSignature: { width: "32%" },
  colDate: { width: "20%" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#888888",
    textAlign: "center",
  },
});

function formatDate(value: string | null): string {
  if (!value) return "\u2014";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${month}/${day}/${year}`;
}

const SIGNATURE_ROW_COUNT = 4;

export function AnnualReportDocument({
  report,
  objectives,
  client,
  location,
}: AnnualReportDocumentProps) {
  const exportYear = new Date(report.created_at).getFullYear();
  const footerLabel = `${location?.name ?? "Care Center"} \u2014 ${client.full_name}`;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Annual Assessment Report {exportYear}</Text>

        <View>
          <Text style={styles.headerField}>
            <Text style={styles.headerLabel}>Care Center: </Text>
            {location?.name ?? "\u2014"}
          </Text>
          <Text style={styles.headerField}>
            <Text style={styles.headerLabel}>Name: </Text>
            {client.full_name}
          </Text>
          <Text style={styles.headerField}>
            <Text style={styles.headerLabel}>Date of Birth: </Text>
            {formatDate(client.date_of_birth)}
          </Text>
          <Text style={styles.headerField}>
            <Text style={styles.headerLabel}>Date of Admission: </Text>
            {formatDate(client.date_of_admission)}
          </Text>
          <Text style={styles.headerField}>
            <Text style={styles.headerLabel}>Date of Review: </Text>
            {formatDate(report.review_date)}
          </Text>
          <Text style={styles.headerField}>
            <Text style={styles.headerLabel}>Period: </Text>
            {formatDate(report.period_start)} {"\u2013"}{" "}
            {formatDate(report.period_end)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Annual Summary</Text>
          {report.summary ? (
            <Text style={styles.paragraph}>{report.summary}</Text>
          ) : (
            <Text style={styles.emptyState}>No summary provided.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Program Overview</Text>
          {location?.program_description ? (
            <Text style={styles.paragraph}>{location.program_description}</Text>
          ) : (
            <Text style={styles.emptyState}>
              No program description on file.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Objectives &amp; Annual Progress</Text>
          {objectives.length === 0 ? (
            <Text style={styles.emptyState}>
              No objectives were tracked for this client during the review
              period.
            </Text>
          ) : (
            objectives.map((objective) => {
              const rating =
                objective.rating_percent === null
                  ? null
                  : getReportRating(objective.rating_percent);
              return (
                <View
                  key={objective.id}
                  style={styles.objectiveBlock}
                  wrap={false}
                >
                  <Text style={styles.objectiveTitle}>
                    {objective.objective_title}
                  </Text>
                  <Text style={styles.objectiveRating}>
                    {rating
                      ? `Achieved on ${objective.yes_count} of ${objective.tracked_days} tracked days`
                      : "No tracked data"}
                  </Text>
                  {rating ? (
                    <>
                      <Text style={styles.objectiveRating}>
                        {formatReportRating(objective.rating_percent!)}
                      </Text>
                      <Text style={styles.paragraph}>
                        {rating.description}
                      </Text>
                    </>
                  ) : null}
                </View>
              );
            })
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attendees</Text>
          <View style={styles.signatureTable}>
            <View style={styles.signatureHeaderRow}>
              <Text style={[styles.signatureHeaderCell, styles.colName]}>
                Name
              </Text>
              <Text style={[styles.signatureHeaderCell, styles.colRole]}>
                Role
              </Text>
              <Text style={[styles.signatureHeaderCell, styles.colSignature]}>
                Signature
              </Text>
              <Text style={[styles.signatureHeaderCell, styles.colDate]}>
                Date
              </Text>
            </View>
            {Array.from({ length: SIGNATURE_ROW_COUNT }).map((_, index) => (
              <View key={index} style={styles.signatureRow}>
                <Text style={styles.colName}> </Text>
                <Text style={styles.colRole}> </Text>
                <Text style={styles.colSignature}> </Text>
                <Text style={styles.colDate}> </Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.footer}>{footerLabel}</Text>
      </Page>
    </Document>
  );
}

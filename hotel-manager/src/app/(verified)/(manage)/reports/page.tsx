import Alert from "@/components/ui/Alert";
import { buttonClass } from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { type Column } from "@/components/ui/DataTable";
import TabNav from "@/components/ui/TabNav";
import ReportFilters from "@/components/reports/ReportFilters";
import ReportSummary from "@/components/reports/ReportSummary";
import {
  REPORTS,
  REPORT_SLUGS,
  type ReportSlug,
} from "@/components/reports/reportConfig";
import { BadRequestError } from "@/lib/apiResponse";
import centsToUSD from "@/lib/centsToUSD";
import type { Report, ReportRow } from "@/lib/csv";
import { addDays, today } from "@/lib/dates";
import {
  revenueReportSchema,
  type RevenueReportFilters,
} from "@/schemas/report";
import { requireRole, type Session } from "@/services/authService";
import {
  getCancellationReport,
  getGuestReport,
  getOccupancyReport,
  getRevenueReport,
  getRoomCategoryReport,
  getStaffTaskReport,
} from "@/services/reportService";

type ReportsProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

function run(
  slug: ReportSlug,
  filters: RevenueReportFilters,
  session: Session,
): Promise<Report> {
  switch (slug) {
    case "revenue":
      return getRevenueReport(filters, session);
    case "occupancy":
      return getOccupancyReport(filters, session);
    case "cancellations":
      return getCancellationReport(filters, session);
    case "room-categories":
      return getRoomCategoryReport(filters, session);
    case "guests":
      return getGuestReport(filters, session);
    case "staff-tasks":
      return getStaffTaskReport(filters, session);
  }
}

export default async function ReportsPage({ searchParams }: ReportsProps) {
  const session = await requireRole("ADMIN", "MANAGER");
  const raw = await searchParams;

  const requested = first(raw.report);
  const slug: ReportSlug =
    REPORT_SLUGS.find((s) => s === requested) ?? "revenue";

  const endDate = first(raw.endDate) ?? today();
  const startDate = first(raw.startDate) ?? addDays(endDate, -29);
  const period = first(raw.period) ?? "daily";

  const parsed = revenueReportSchema.safeParse({ startDate, endDate, period });

  let report: Report | null = null;
  let error: string | null = null;
  if (!parsed.success) {
    error = "Enter a valid date range.";
  } else {
    try {
      report = await run(slug, parsed.data, session);
    } catch (e) {
      if (e instanceof BadRequestError) error = e.message;
      else throw e;
    }
  }

  const query = (report: ReportSlug) => {
    const params = new URLSearchParams({ report, startDate, endDate });
    if (report === "revenue") params.set("period", period);
    return params;
  };

  const csvParams = query(slug);
  csvParams.delete("report");
  csvParams.set("format", "csv");

  const columns: Column<ReportRow>[] = (report?.columns ?? []).map((c) => {
    const numeric =
      c.money || report?.rows.some((r) => typeof r[c.key] === "number");
    return {
      key: c.key,
      label: c.label,
      align: numeric ? "right" : "left",
      render: (row) => {
        const value = row[c.key];
        if (value === null || value === undefined) return "–";
        if (typeof value === "number") {
          return c.money
            ? centsToUSD(Math.round(value))
            : value.toLocaleString("en-US");
        }
        return value;
      },
    };
  });

  return (
    <div className="content">
      <h1 className="text-2xl font-semibold">Reports</h1>

      <TabNav
        label="Report type"
        items={REPORT_SLUGS.map((s) => ({
          href: `/reports?${query(s)}`,
          label: REPORTS[s].label,
          active: s === slug,
        }))}
      />

      <Card>
        <ReportFilters
          slug={slug}
          startDate={startDate}
          endDate={endDate}
          period={period}
        />
      </Card>

      {error && <Alert>{error}</Alert>}

      {report && (
        <>
          <ReportSummary
            fields={REPORTS[slug].summary}
            summary={report.summary}
          />

          <Card
            title={`${REPORTS[slug].label} report: ${startDate} to ${endDate}`}
          >
            <div className="mb-4 flex justify-end">
              <a
                href={`/api/reports/${slug}?${csvParams}`}
                className={buttonClass("secondary")}
              >
                Export CSV
              </a>
            </div>
            <DataTable
              caption={`${REPORTS[slug].label} report`}
              columns={columns}
              rows={report.rows}
              rowKey={(_, index) => String(index)}
              emptyMessage="No data for this date range."
            />
          </Card>
        </>
      )}
    </div>
  );
}

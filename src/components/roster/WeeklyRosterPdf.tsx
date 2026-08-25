// src/components/roster/WeeklyRosterPdf.tsx
//
// Fallback for generating the PDF entirely in the browser, no Laravel work
// needed. Good for getting the "lock and hand out a PDF" workflow live today;
// swap to the Laravel/dompdf route (see roster-pdf-controller.php) later if
// you want print quality, server-side archiving, or emailing the file.
//
// Requires: npm install @react-pdf/renderer

'use client';

import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';
import dayjs, { Dayjs } from 'dayjs';
import { DutyInstance, StaffMember, WeekLock, getCoverageStatus } from '@/types/roster';
import { DUTY_TYPES } from '@/lib/cms/roster';

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 9, fontFamily: 'Helvetica' },
  headerRow: { borderBottomWidth: 2, borderBottomColor: '#12233F', paddingBottom: 8, marginBottom: 12 },
  title: { fontSize: 15, fontWeight: 700, color: '#12233F' },
  meta: { fontSize: 8, color: '#64748b', marginTop: 2 },
  lockBadge: { fontSize: 7, color: '#92400e', backgroundColor: '#fef3c7', padding: 3, marginTop: 4, width: 130 },
  dayBlock: { marginBottom: 12 },
  dayTitle: { fontSize: 11, fontWeight: 700, backgroundColor: '#12233F', color: '#fff', padding: 5, marginBottom: 3 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', paddingVertical: 3, paddingHorizontal: 4 },
  tableHeaderCell: { fontSize: 7, color: '#64748b', textTransform: 'uppercase' },
  row: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  cellTime: { width: 70, fontFamily: 'Courier' },
  cellDuty: { width: 140 },
  cellCoverage: { width: 50 },
  cellStaff: { flex: 1 },
  flightTag: { fontSize: 7, backgroundColor: '#0f172a', color: '#fff', padding: 2, borderRadius: 2 },
  gateText: { fontSize: 7, color: '#94a3b8' },
  emptyDay: { fontSize: 8, color: '#94a3b8', fontStyle: 'italic', padding: 4 },
  footer: { marginTop: 16, fontSize: 7, color: '#94a3b8', textAlign: 'right' },
});

interface Props {
  weekStart: Dayjs;
  instances: DutyInstance[]; // all instances for the 7-day window
  lock: WeekLock | null;
  staffList: StaffMember[];
}

function WeeklyRosterDocument({ weekStart, instances, lock, staffList }: Props) {
  const days = Array.from({ length: 7 }).map((_, i) => weekStart.add(i, 'day'));

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Weekly Duty Roster</Text>
          <Text style={styles.meta}>
            {weekStart.format('D MMM YYYY')} \u2013 {weekStart.add(6, 'day').format('D MMM YYYY')}
          </Text>
          {lock && (
            <Text style={styles.lockBadge}>
              LOCKED \u00b7 by {lock.lockedBy} on {dayjs(lock.lockedAt).format('D MMM, HH:mm')}
            </Text>
          )}
        </View>

        {days.map((day) => {
          const dateStr = day.format('YYYY-MM-DD');
          const dayInstances = instances
            .filter((i) => i.date === dateStr)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

          return (
            <View key={dateStr} style={styles.dayBlock} wrap={false}>
              <Text style={styles.dayTitle}>{day.format('dddd, D MMMM YYYY')}</Text>

              {dayInstances.length === 0 ? (
                <Text style={styles.emptyDay}>No duties scheduled</Text>
              ) : (
                <View>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderCell, styles.cellTime]}>Time</Text>
                    <Text style={[styles.tableHeaderCell, styles.cellDuty]}>Duty</Text>
                    <Text style={[styles.tableHeaderCell, styles.cellCoverage]}>Coverage</Text>
                    <Text style={[styles.tableHeaderCell, styles.cellStaff]}>Staff assigned</Text>
                  </View>
                  {dayInstances.map((instance) => {
                    const dutyType = DUTY_TYPES.find((d) => d.id === instance.dutyTypeId);
                    const coverage = getCoverageStatus(instance);
                    const staffNames = instance.assignedStaffIds
                      .map((id) => staffList.find((s) => s.id === id)?.name)
                      .filter(Boolean)
                      .join(', ');

                    return (
                      <View key={instance.id} style={styles.row}>
                        <Text style={styles.cellTime}>{instance.startTime}\u2013{instance.endTime}</Text>
                        <View style={styles.cellDuty}>
                          <Text>{dutyType?.name ?? 'Unknown'}{instance.flightNumber ? `  ${instance.flightNumber}` : ''}</Text>
                          {instance.gate && <Text style={styles.gateText}>Gate {instance.gate}</Text>}
                        </View>
                        <Text style={{ ...styles.cellCoverage, color: coverage.state === 'understaffed' ? '#b91c1c' : '#15803d', fontWeight: 700 }}>
                          {coverage.assigned}/{coverage.required}
                        </Text>
                        <Text style={styles.cellStaff}>{staffNames || '\u2014 unassigned \u2014'}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        <Text style={styles.footer}>Generated {dayjs().format('D MMM YYYY, HH:mm')}</Text>
      </Page>
    </Document>
  );
}

/** Drop this in place of the "Export PDF" button's window.open call if you
 *  want a working export before the Laravel endpoint exists. */
export function WeeklyRosterPdfDownloadButton({ weekStart, instances, lock, staffList }: Props) {
  return (
    <PDFDownloadLink
      document={<WeeklyRosterDocument weekStart={weekStart} instances={instances} lock={lock} staffList={staffList} />}
      fileName={`roster-${weekStart.format('YYYY-MM-DD')}.pdf`}
      className="flex items-center gap-1.5 rounded-md border border-white/20 px-3 py-1.5 text-sm text-white hover:bg-white/10"
    >
      {({ loading }) => (loading ? 'Preparing PDF\u2026' : 'Export PDF')}
    </PDFDownloadLink>
  );
}
import React, { useState, useMemo } from 'react';
import { ZenvAnalyticsChartIcon } from './ZenvIcons';
import './DashboardCharts.css';

export function AttendanceBarChart({ analytics, liveData, reportData = [], sessions = [], events = [] }) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();
  const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthFullNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const [timeframe, setTimeframe] = useState('week'); // 'week' | 'months'
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(currentMonthIdx);
  const [hoveredGroup, setHoveredGroup] = useState(null);

  const totalPeople = analytics?.totalPeople || 0;

  // 1. Available Years for Monthly / Weekly historical view
  const availableYears = useMemo(() => {
    const years = new Set([
      currentYear - 2, currentYear - 1, currentYear,
      ...(sessions || []).map(s => s.workDate ? parseInt(s.workDate.substring(0, 4), 10) : null).filter(Boolean),
      ...(events || []).map(e => e.occurredAt ? parseInt(e.occurredAt.substring(0, 4), 10) : null).filter(Boolean)
    ]);
    return Array.from(years).filter(y => y <= currentYear).sort((a, b) => b - a);
  }, [currentYear, sessions, events]);

  // 2. Available Months for selectedYear (exclude future months)
  const availableMonths = useMemo(() => {
    return monthNames.map((name, idx) => ({
      idx,
      name,
      fullName: monthFullNames[idx],
      isFuture: (selectedYear === currentYear && idx > currentMonthIdx) || (selectedYear > currentYear),
      isCurrent: (selectedYear === currentYear && idx === currentMonthIdx)
    })).filter(m => !m.isFuture);
  }, [monthNames, monthFullNames, selectedYear, currentYear, currentMonthIdx]);

  // 3. Weeks for the selected month
  const daysInSelectedMonth = new Date(selectedYear, selectedMonthIdx + 1, 0).getDate();
  const selectedMonthShort = monthNames[selectedMonthIdx];
  const selectedMonthFull = monthFullNames[selectedMonthIdx];

  const weeksForSelectedMonth = useMemo(() => {
    const isCurrentMonthOfCurrentYear = (selectedYear === currentYear && selectedMonthIdx === currentMonthIdx);
    const todayDate = now.getDate();

    const buckets = [
      { id: 1, label: `Week 1 (1–7 ${selectedMonthShort})`, startDay: 1, endDay: 7 },
      { id: 2, label: `Week 2 (8–14 ${selectedMonthShort})`, startDay: 8, endDay: 14 },
      { id: 3, label: `Week 3 (15–21 ${selectedMonthShort})`, startDay: 15, endDay: 21 },
      { id: 4, label: `Week 4 (22–28 ${selectedMonthShort})`, startDay: 22, endDay: 28 },
    ];
    if (daysInSelectedMonth >= 29) {
      buckets.push({
        id: 5,
        label: `Week 5 (29–${daysInSelectedMonth} ${selectedMonthShort})`,
        startDay: 29,
        endDay: daysInSelectedMonth
      });
    }

    return buckets.map(b => {
      const isCurrent = isCurrentMonthOfCurrentYear && (todayDate >= b.startDay && todayDate <= b.endDay);
      return {
        ...b,
        isCurrent,
        dropdownLabel: isCurrent ? `${b.label} (Current)` : b.label
      };
    });
  }, [selectedYear, selectedMonthIdx, currentYear, currentMonthIdx, daysInSelectedMonth, selectedMonthShort]);

  // Default selected week
  const [selectedWeekId, setSelectedWeekId] = useState(() => {
    const active = weeksForSelectedMonth.find(w => w.isCurrent);
    return active ? active.id : 1;
  });

  const selectedWeekBucket = weeksForSelectedMonth.find(w => w.id === selectedWeekId) || weeksForSelectedMonth[0];

  // 4. Weekly Data: Days within the selected month's week
  const weekData = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days = [];

    for (let d = selectedWeekBucket.startDay; d <= selectedWeekBucket.endDay; d++) {
      const dayDate = new Date(selectedYear, selectedMonthIdx, d);
      dayDate.setHours(0, 0, 0, 0);

      const dayName = dayNames[dayDate.getDay()];
      const dateStr = `${selectedYear}-${String(selectedMonthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = (dateStr === todayDateStr);
      const isFuture = (selectedYear === currentYear && selectedMonthIdx === currentMonthIdx && d > now.getDate()) ||
                       (selectedYear === currentYear && selectedMonthIdx > currentMonthIdx) ||
                       (selectedYear > currentYear);

      if (isFuture) {
        days.push({
          label: `${dayName} ${d}`,
          subLabel: `${d} ${selectedMonthShort}`,
          present: null,
          absent: null,
          total: totalPeople,
          isCurrent: false,
          isFuture: true
        });
        continue;
      }

      // Find present from sessions
      const daySessions = (sessions || []).filter(s => s.workDate === dateStr);
      let presentCount = new Set(daySessions.map(s => s.personId)).size;

      // Fallback to events if sessions empty
      if (presentCount === 0 && (events || []).length > 0) {
        const dayEvents = (events || []).filter(e => {
          const eDate = e.occurredAt ? e.occurredAt.substring(0, 10) : '';
          return eDate === dateStr && (e.decision === 'GRANTED' || e.eventType === 'CHECK_IN');
        });
        presentCount = new Set(dayEvents.map(e => e.person?.personId).filter(Boolean)).size;
      }

      // Merge live headcount for today
      if (isToday && liveData?.headcount !== undefined) {
        presentCount = Math.max(presentCount, liveData.headcount);
      }

      const absentCount = Math.max(0, totalPeople - presentCount);

      days.push({
        label: `${dayName} ${d}`,
        subLabel: `${d} ${selectedMonthShort}`,
        present: presentCount,
        absent: absentCount,
        total: totalPeople,
        isCurrent: isToday,
        isFuture: false
      });
    }

    return days;
  }, [selectedWeekBucket, selectedYear, selectedMonthIdx, selectedMonthShort, todayDateStr, currentYear, currentMonthIdx, sessions, events, liveData, totalPeople]);

  // 4. Monthly Comparison Data across 12 months for selectedYear
  const monthsData = useMemo(() => {
    return monthNames.map((mLabel, mIdx) => {
      const isCurrentMonthOfCurrentYear = (mIdx === now.getMonth() && selectedYear === currentYear);
      const isFuture = (selectedYear === currentYear && mIdx > now.getMonth()) || (selectedYear > currentYear);

      if (isFuture) {
        return {
          label: mLabel,
          subLabel: monthFullNames[mIdx],
          present: null,
          absent: null,
          total: totalPeople,
          isCurrent: false,
          isFuture: true
        };
      }

      // Filter sessions matching month and year
      const monthSessions = (sessions || []).filter(s => {
        if (!s.workDate) return false;
        const yr = parseInt(s.workDate.substring(0, 4), 10);
        const mo = parseInt(s.workDate.substring(5, 7), 10) - 1;
        return yr === selectedYear && mo === mIdx;
      });

      let distinctDates = Array.from(new Set(monthSessions.map(s => s.workDate)));
      let totalPresent = monthSessions.length;

      // Fallback to events if sessions empty
      if (totalPresent === 0 && (events || []).length > 0) {
        const monthEvents = (events || []).filter(e => {
          if (!e.occurredAt) return false;
          const yr = parseInt(e.occurredAt.substring(0, 4), 10);
          const mo = parseInt(e.occurredAt.substring(5, 7), 10) - 1;
          return yr === selectedYear && mo === mIdx && (e.decision === 'GRANTED' || e.eventType === 'CHECK_IN');
        });
        distinctDates = Array.from(new Set(monthEvents.map(e => e.occurredAt.substring(0, 10))));
        const dailyUniqueSet = new Set(monthEvents.map(e => `${e.occurredAt.substring(0, 10)}_${e.person?.personId}`));
        totalPresent = dailyUniqueSet.size;
      }

      // Merge today's live headcount for current month
      if (isCurrentMonthOfCurrentYear && liveData?.headcount > 0 && !distinctDates.includes(todayDateStr)) {
        distinctDates.push(todayDateStr);
        totalPresent += liveData.headcount;
      }

      const activeDaysInMonth = Math.max(1, distinctDates.length);
      const avgPresent = distinctDates.length > 0 ? Math.round(totalPresent / activeDaysInMonth) : 0;
      const avgAbsent = distinctDates.length > 0 ? Math.max(0, totalPeople - avgPresent) : 0;
      const attendanceRate = totalPeople > 0 && distinctDates.length > 0
        ? Math.min(100, Math.max(0, Math.round((totalPresent / (totalPeople * distinctDates.length)) * 100)))
        : 0;

      return {
        label: mLabel,
        subLabel: distinctDates.length > 0 ? `${monthFullNames[mIdx]} (${distinctDates.length} days active)` : monthFullNames[mIdx],
        present: avgPresent,
        absent: avgAbsent,
        attendanceRate,
        activeDays: distinctDates.length,
        total: totalPeople,
        isCurrent: isCurrentMonthOfCurrentYear,
        isFuture: false
      };
    });
  }, [monthNames, monthFullNames, selectedYear, currentYear, sessions, events, liveData, todayDateStr, totalPeople]);

  const currentDataset = timeframe === 'week' ? weekData : monthsData;

  // Find max value across Present and Absent for scaling
  const maxVal = Math.max(
    ...currentDataset.map(d => Math.max(d.present || 0, d.absent || 0, 1)),
    totalPeople > 0 ? totalPeople : 1
  );

  return (
    <div className="chart-container card">
      <div className="chart-header">
        <div className="chart-title">
          <ZenvAnalyticsChartIcon size={22} className="chart-icon-header" primaryColor="var(--color-primary)" accentColor="var(--color-primary-light)" />
          <div>
            <h3>Attendance Overview Trend</h3>
            <span className="chart-subtitle">
              {timeframe === 'week' 
                ? `Weekly comparison for ${selectedMonthFull} ${selectedYear} (${selectedWeekBucket.label})` 
                : `Monthly attendance performance for ${selectedYear}`}
            </span>
          </div>
        </div>

        {/* Controls: Month & Week Selectors in Weekly / Year Selector in Monthly */}
        <div className="chart-controls-wrapper">
          {timeframe === 'week' && (
            <>
              <div className="week-selector-container">
                <label htmlFor="chart-month-select" className="filter-label">Month:</label>
                <select
                  id="chart-month-select"
                  className="chart-select"
                  value={selectedMonthIdx}
                  onChange={(e) => {
                    const newM = Number(e.target.value);
                    setSelectedMonthIdx(newM);
                    setSelectedWeekId(1);
                  }}
                >
                  {availableMonths.map(m => (
                    <option key={m.idx} value={m.idx}>
                      {m.name} {m.isCurrent ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="week-selector-container">
                <label htmlFor="chart-week-select" className="filter-label">Week:</label>
                <select
                  id="chart-week-select"
                  className="chart-select"
                  value={selectedWeekId}
                  onChange={(e) => setSelectedWeekId(Number(e.target.value))}
                >
                  {weeksForSelectedMonth.map(w => (
                    <option key={w.id} value={w.id}>{w.dropdownLabel}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {timeframe === 'months' && (
            <div className="year-selector-container">
              <label htmlFor="chart-year-select" className="filter-label">Year:</label>
              <select
                id="chart-year-select"
                className="chart-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {availableYears.map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>
          )}

          <div className="timeframe-buttons">
            <button 
              className={`timeframe-btn ${timeframe === 'week' ? 'active' : ''}`}
              onClick={() => setTimeframe('week')}
            >
              Weekly
            </button>
            <button 
              className={`timeframe-btn ${timeframe === 'months' ? 'active' : ''}`}
              onClick={() => setTimeframe('months')}
            >
              Monthly
            </button>
          </div>
        </div>
      </div>

      {/* Comparison Bar Chart Body (Present vs Absentees only) */}
      <div className="bar-chart-body comparison-chart">
        <div className="bar-chart-grid comparison-grid">
          {currentDataset.map((item, idx) => {
            const isHovered = hoveredGroup === idx;

            const presentHeight = !item.isFuture && maxVal > 0 && item.present > 0 
              ? Math.min(88, Math.max(6, Math.round((item.present / maxVal) * 78))) 
              : 0;
            const absentHeight = !item.isFuture && maxVal > 0 && item.absent > 0 
              ? Math.min(88, Math.max(6, Math.round((item.absent / maxVal) * 78))) 
              : 0;

            return (
              <div 
                key={idx} 
                className={`bar-group-column ${isHovered ? 'hovered' : ''} ${item.isCurrent ? 'current-item' : ''} ${item.isFuture ? 'future-item' : ''}`}
                onMouseEnter={() => setHoveredGroup(idx)}
                onMouseLeave={() => setHoveredGroup(null)}
              >
                {/* Tooltip on Hover */}
                {isHovered && (
                  <div className="chart-tooltip comparison-tooltip">
                    <div className="tooltip-title">{item.label} {item.subLabel ? `(${item.subLabel})` : ''}</div>
                    {item.isFuture || (timeframe === 'months' && item.activeDays === 0) ? (
                      <div className="tooltip-row future-row">
                        {item.isFuture ? 'Upcoming - No attendance yet' : 'No attendance data'}
                      </div>
                    ) : (
                      <>
                        {timeframe === 'months' ? (
                          <>
                            <div className="tooltip-row present-row">
                              <span>Attendance Rate:</span>
                              <strong>{item.attendanceRate}%</strong>
                            </div>
                            <div className="tooltip-row present-row">
                              <span>Present Average:</span>
                              <strong>{item.present}</strong>
                            </div>
                            <div className="tooltip-row absent-row">
                              <span>Absent Average:</span>
                              <strong>{item.absent}</strong>
                            </div>
                            <div className="tooltip-row total-row">
                              <span>Active Days:</span>
                              <strong>{item.activeDays}</strong>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="tooltip-row present-row">
                              <span>Present:</span>
                              <strong>{item.present}</strong>
                            </div>
                            <div className="tooltip-row absent-row">
                              <span>Absentees:</span>
                              <strong>{item.absent}</strong>
                            </div>
                          </>
                        )}
                        <div className="tooltip-divider"></div>
                        <div className="tooltip-row total-row">
                          <span>Total Headcount:</span>
                          <strong>{item.total}</strong>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Monthly uses a 100% stacked rate bar; weekly uses side-by-side counts. */}
                <div className="comparison-bars-container two-bars">
                  {item.isFuture || (timeframe === 'months' && item.activeDays === 0) ? (
                    <div className="future-placeholder-track">
                      <div className="future-placeholder-line"></div>
                    </div>
                  ) : timeframe === 'months' ? (
                    <div className="monthly-rate-track">
                      <div className="monthly-rate-fill monthly-rate-present" style={{ height: `${item.attendanceRate}%` }}>
                        {item.attendanceRate >= 14 && <span>{item.attendanceRate}%</span>}
                      </div>
                      <div className="monthly-rate-fill monthly-rate-absent" style={{ height: `${100 - item.attendanceRate}%` }}>
                        {item.attendanceRate <= 86 && <span>{100 - item.attendanceRate}%</span>}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Present Bar */}
                      <div className="comparison-bar-track">
                        {presentHeight > 0 ? (
                          <div 
                            className="bar-fill bar-present" 
                            style={{ height: `${presentHeight}%` }}
                          >
                            <span className="bar-mini-val val-present">{item.present}</span>
                          </div>
                        ) : (
                          <div className="bar-fill-zero">
                            <span className="bar-mini-val val-present zero-val">0</span>
                          </div>
                        )}
                      </div>

                      {/* Absentees Bar */}
                      <div className="comparison-bar-track">
                        {absentHeight > 0 ? (
                          <div 
                            className="bar-fill bar-absent" 
                            style={{ height: `${absentHeight}%` }}
                          >
                            <span className="bar-mini-val val-absent">{item.absent}</span>
                          </div>
                        ) : (
                          <div className="bar-fill-zero">
                            <span className="bar-mini-val val-absent zero-val">0</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className={`bar-label ${isHovered ? 'active' : ''}`}>{item.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend follows the active timeframe. */}
      <div className="chart-legend comparison-legend">
        <div className="legend-item">
          <span className="legend-color legend-present"></span>
          <span>{timeframe === 'months' ? 'Present Rate' : 'Present'}</span>
        </div>
        <div className="legend-item">
          <span className="legend-color legend-absent"></span>
          <span>{timeframe === 'months' ? 'Absent Rate' : 'Absentees'}</span>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { ZenvAnalyticsChartIcon } from './ZenvIcons';
import './DashboardCharts.css';

export function AttendanceBarChart({ analytics, liveData, reportData = [], sessions = [], events = [] }) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const [timeframe, setTimeframe] = useState('week'); // 'week' | 'months'
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [hoveredGroup, setHoveredGroup] = useState(null);

  // Extract available years up to current year (no future years)
  const availableYears = Array.from(new Set([
    currentYear - 2, currentYear - 1, currentYear,
    ...(sessions || []).map(s => s.workDate ? parseInt(s.workDate.substring(0, 4), 10) : null).filter(Boolean),
    ...(events || []).map(e => e.occurredAt ? parseInt(e.occurredAt.substring(0, 4), 10) : null).filter(Boolean)
  ])).filter(y => y <= currentYear).sort((a, b) => b - a);

  const totalPeople = analytics?.totalPeople || 0;

  // 1. Weekly Comparison Data (All 7 days visible; no attendance shown for upcoming days)
  const dayOfWeek = now.getDay();
  const distanceToMon = (dayOfWeek + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - distanceToMon);
  monday.setHours(0, 0, 0, 0);

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName, idx) => {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + idx);
    dayDate.setHours(0, 0, 0, 0);

    const dateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;
    const isToday = (dateStr === todayDateStr);
    const isFuture = (dayDate.getTime() > todayStart.getTime());

    if (isFuture) {
      return {
        label: dayName,
        subLabel: `${dayDate.getDate()} ${dayDate.toLocaleString('default', { month: 'short' })}`,
        present: null,
        absent: null,
        total: totalPeople,
        isCurrent: false,
        isFuture: true
      };
    }

    // Find unique present persons on this date from sessions
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

    return {
      label: dayName,
      subLabel: `${dayDate.getDate()} ${dayDate.toLocaleString('default', { month: 'short' })}`,
      present: presentCount,
      absent: absentCount,
      total: totalPeople,
      isCurrent: isToday,
      isFuture: false
    };
  });

  // 2. Monthly Comparison Data (All 12 months visible; no attendance shown for upcoming months)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthFullNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const monthsData = monthNames.map((mLabel, mIdx) => {
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

    return {
      label: mLabel,
      subLabel: distinctDates.length > 0 ? `${monthFullNames[mIdx]} (${distinctDates.length} days active)` : monthFullNames[mIdx],
      present: avgPresent,
      absent: avgAbsent,
      total: totalPeople,
      isCurrent: isCurrentMonthOfCurrentYear,
      isFuture: false
    };
  });

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
          <ZenvAnalyticsChartIcon size={22} className="chart-icon-header" primaryColor="#102b4d" accentColor="#1e556d" />
          <div>
            <h3>Attendance Overview Trend</h3>
            <span className="chart-subtitle">
              {timeframe === 'week' 
                ? 'Weekly comparison (Present vs Absentees)' 
                : `Monthly breakdown for ${selectedYear} (Present vs Absentees)`}
            </span>
          </div>
        </div>

        {/* Controls: Only Weekly & Monthly */}
        <div className="chart-controls-wrapper">
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
                    {item.isFuture ? (
                      <div className="tooltip-row future-row" style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.75rem', fontStyle: 'italic', margin: '4px 0 0 0' }}>
                        Upcoming - No attendance yet
                      </div>
                    ) : (
                      <>
                        <div className="tooltip-row present-row">
                          <span>{timeframe === 'months' ? 'Avg. Present:' : 'Present:'}</span>
                          <strong>{item.present}</strong>
                        </div>
                        <div className="tooltip-row absent-row">
                          <span>{timeframe === 'months' ? 'Avg. Absentees:' : 'Absentees:'}</span>
                          <strong>{item.absent}</strong>
                        </div>
                        <div className="tooltip-divider"></div>
                        <div className="tooltip-row total-row">
                          <span>Total Headcount:</span>
                          <strong>{item.total}</strong>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* 2 Comparison Bars: Present and Absentees, or Empty for upcoming */}
                <div className="comparison-bars-container two-bars">
                  {item.isFuture ? (
                    <div className="future-placeholder-track">
                      <div className="future-placeholder-line"></div>
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

      {/* Comparison Legend: Present and Absentees only */}
      <div className="chart-legend comparison-legend">
        <div className="legend-item">
          <span className="legend-color legend-present"></span>
          <span>Present</span>
        </div>
        <div className="legend-item">
          <span className="legend-color legend-absent"></span>
          <span>Absentees</span>
        </div>
      </div>
    </div>
  );
}

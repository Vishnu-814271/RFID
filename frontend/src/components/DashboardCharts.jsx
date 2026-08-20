import React, { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import './DashboardCharts.css';

export function AttendanceBarChart({ analytics, liveData, reportData = [], events = [] }) {
  const now = new Date();
  const currentYear = now.getFullYear();

  const [timeframe, setTimeframe] = useState('week'); // 'week' | 'months'
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [hoveredGroup, setHoveredGroup] = useState(null);

  // Extract available years from reportData + events
  const availableYears = Array.from(new Set([
    currentYear - 2, currentYear - 1, currentYear, currentYear + 1,
    ...(reportData || []).map(r => {
      const d = r.workDate || (r.checkInAt ? r.checkInAt.substring(0, 4) : null);
      return d ? parseInt(d.substring(0, 4), 10) : null;
    }).filter(Boolean),
    ...(events || []).map(e => {
      return e.occurredAt ? parseInt(e.occurredAt.substring(0, 4), 10) : null;
    }).filter(Boolean)
  ])).sort((a, b) => b - a);

  const totalPeople = analytics?.totalPeople || 0;

  // 1. Weekly Comparison Data (Mon - Sun of current week)
  const dayOfWeek = now.getDay();
  const distanceToMon = (dayOfWeek + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - distanceToMon);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekData = days.map((dayLabel, index) => {
    const targetDate = new Date(monday);
    targetDate.setDate(monday.getDate() + index);
    const dateStr = targetDate.toISOString().split('T')[0];
    const isToday = index === distanceToMon;

    const daySessions = (reportData || []).filter(r => 
      r.workDate === dateStr || (r.checkInAt && r.checkInAt.startsWith(dateStr))
    );

    const presentCount = daySessions.length > 0 ? daySessions.length : (isToday && liveData?.headcount ? liveData.headcount : 0);
    const absentCount = Math.max(0, totalPeople - presentCount);

    return {
      label: dayLabel,
      subLabel: targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      date: dateStr,
      present: presentCount,
      absent: absentCount,
      total: totalPeople,
      isCurrent: isToday
    };
  });

  // 2. Monthly Comparison Data (Jan - Dec for selectedYear)
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthFullNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const monthsData = monthLabels.map((mLabel, mIdx) => {
    const monthNum = String(mIdx + 1).padStart(2, '0');
    const isCurrentMonthOfCurrentYear = (selectedYear === currentYear) && (mIdx === now.getMonth());

    const monthSessions = (reportData || []).filter(r => {
      const d = r.workDate || (r.checkInAt ? r.checkInAt.substring(0, 10) : null);
      if (!d) return false;
      return d.startsWith(`${selectedYear}-${monthNum}`);
    });

    const monthEvents = (events || []).filter(e => {
      if (!e.occurredAt) return false;
      return e.occurredAt.startsWith(`${selectedYear}-${monthNum}`);
    });

    const presentCount = monthSessions.length > 0 ? monthSessions.length : (isCurrentMonthOfCurrentYear && liveData?.headcount ? liveData.headcount : monthEvents.length);
    
    // Only calculate expected attendance based on actual active logged days in that month
    const distinctDates = new Set(monthSessions.map(r => r.workDate || (r.checkInAt ? r.checkInAt.substring(0, 10) : null)).filter(Boolean));
    const activeDaysInMonth = distinctDates.size;
    const expectedMonthSessions = totalPeople * activeDaysInMonth;
    const absentCount = Math.max(0, expectedMonthSessions - presentCount);

    return {
      label: mLabel,
      subLabel: monthFullNames[mIdx],
      present: presentCount,
      absent: absentCount,
      total: expectedMonthSessions,
      isCurrent: isCurrentMonthOfCurrentYear
    };
  });

  const currentDataset = timeframe === 'week' ? weekData : monthsData;

  // Find max value across Present and Absent for scaling
  const maxVal = Math.max(
    ...currentDataset.map(d => Math.max(d.present, d.absent, 1)),
    totalPeople > 0 ? totalPeople : 1
  );

  return (
    <div className="chart-container card">
      <div className="chart-header">
        <div className="chart-title">
          <BarChart3 size={20} className="chart-icon-header" />
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

            const presentHeight = maxVal > 0 && item.present > 0 ? Math.min(100, Math.max(8, Math.round((item.present / maxVal) * 85))) : 0;
            const absentHeight = maxVal > 0 && item.absent > 0 ? Math.min(100, Math.max(8, Math.round((item.absent / maxVal) * 85))) : 0;

            return (
              <div 
                key={idx} 
                className={`bar-group-column ${isHovered ? 'hovered' : ''} ${item.isCurrent ? 'current-item' : ''}`}
                onMouseEnter={() => setHoveredGroup(idx)}
                onMouseLeave={() => setHoveredGroup(null)}
              >
                {/* Tooltip on Hover */}
                {isHovered && (
                  <div className="chart-tooltip comparison-tooltip">
                    <div className="tooltip-title">{item.label} {item.date ? `(${item.date})` : item.subLabel ? `(${item.subLabel})` : ''}</div>
                    <div className="tooltip-row present-row">
                      <span>Present:</span>
                      <strong>{item.present}</strong>
                    </div>
                    <div className="tooltip-row absent-row">
                      <span>Absentees:</span>
                      <strong>{item.absent}</strong>
                    </div>
                    <div className="tooltip-divider"></div>
                    <div className="tooltip-row total-row">
                      <span>Total Expected:</span>
                      <strong>{item.total}</strong>
                    </div>
                  </div>
                )}

                {/* 2 Comparison Bars: Present and Absentees */}
                <div className="comparison-bars-container two-bars">
                  {/* Present Bar */}
                  <div className="comparison-bar-track">
                    {presentHeight > 0 ? (
                      <div 
                        className="bar-fill bar-present" 
                        style={{ height: `${presentHeight}%` }}
                      >
                        <span className="bar-mini-val">{item.present}</span>
                      </div>
                    ) : (
                      <div className="bar-fill-zero">0</div>
                    )}
                  </div>

                  {/* Absentees Bar */}
                  <div className="comparison-bar-track">
                    {absentHeight > 0 ? (
                      <div 
                        className="bar-fill bar-absent" 
                        style={{ height: `${absentHeight}%` }}
                      >
                        <span className="bar-mini-val">{item.absent}</span>
                      </div>
                    ) : (
                      <div className="bar-fill-zero">0</div>
                    )}
                  </div>
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

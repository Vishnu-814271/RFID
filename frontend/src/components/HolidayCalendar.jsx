import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  Calendar as CalendarIcon, 
  Upload, 
  Download, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Info,
  CalendarDays,
  List,
  LayoutGrid,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import './HolidayCalendar.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function HolidayCalendar({ workingDaysStr }) {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'ADMIN';

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'table'
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New holiday form state
  const [newHoliday, setNewHoliday] = useState({
    date: `${currentYear}-01-01`,
    name: '',
    type: 'PUBLIC_HOLIDAY'
  });

  const yearsList = useMemo(() => {
    const list = [];
    for (let y = currentYear - 2; y <= currentYear + 3; y++) {
      list.push(y);
    }
    return list;
  }, [currentYear]);

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get(`/holidays?year=${selectedYear}`);
      setHolidays(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load holidays for ' + selectedYear);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, toast]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  // Count holidays in each month for the month-tabs badges
  const monthHolidayCounts = useMemo(() => {
    const counts = Array(12).fill(0);
    holidays.forEach(h => {
      try {
        const parts = h.holidayDate.split('-');
        const m = parseInt(parts[1], 10) - 1;
        if (m >= 0 && m < 12) counts[m]++;
      } catch {}
    });
    return counts;
  }, [holidays]);

  // Calculate Working Days & Weekly Off statistics for the selected year
  const yearStats = useMemo(() => {
    const isLeap = (selectedYear % 4 === 0 && selectedYear % 100 !== 0) || (selectedYear % 400 === 0);
    const totalDaysInYear = isLeap ? 366 : 365;

    const configuredDays = (workingDaysStr || 'MON,TUE,WED,THU,FRI,SAT')
      .split(',')
      .map(d => d.trim().toUpperCase());

    const dayNameMap = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    let weeklyOffCount = 0;
    const holidayDatesSet = new Set(holidays.map(h => h.holidayDate));

    // Calculate actual working days excluding weekly-offs and overlapping holidays
    let workingDaysCount = 0;
    const curDate = new Date(selectedYear, 0, 1);
    const endDate = new Date(selectedYear, 11, 31);

    while (curDate <= endDate) {
      const dayCode = dayNameMap[curDate.getDay()];
      const isWorkDayOfWeek = configuredDays.includes(dayCode);
      const dateStr = curDate.toISOString().split('T')[0];
      const isDeclaredHoliday = holidayDatesSet.has(dateStr);

      if (!isWorkDayOfWeek) {
        weeklyOffCount++;
      } else if (!isDeclaredHoliday) {
        workingDaysCount++;
      }

      curDate.setDate(curDate.getDate() + 1);
    }

    return {
      totalDaysInYear,
      totalHolidays: holidays.length,
      weeklyOffCount,
      workingDaysCount
    };
  }, [selectedYear, workingDaysStr, holidays]);

  // Build the Calendar Month Grid Cells
  const calendarMonthData = useMemo(() => {
    const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1);
    const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    
    // Day of week: 0 is Sun, 1 is Mon ... 6 is Sat.
    // In our calendar Mon is column 0, Sun is column 6.
    const startDayIndex = (firstDayOfMonth.getDay() + 6) % 7; 
    
    const configuredDays = (workingDaysStr || 'MON,TUE,WED,THU,FRI,SAT')
      .split(',')
      .map(d => d.trim().toUpperCase());
    const dayCodes = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    const holidaysByDate = new Map();
    holidays.forEach(h => {
      holidaysByDate.set(h.holidayDate, h);
    });

    const cells = [];
    // Padding before 1st of month
    for (let i = 0; i < startDayIndex; i++) {
      cells.push({ isPadding: true, dayNumber: null, key: `pad-${i}` });
    }

    // Actual days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const monthStr = String(selectedMonth + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${selectedYear}-${monthStr}-${dayStr}`;
      
      const dayOfWeekCode = dayCodes[(startDayIndex + (day - 1)) % 7];
      const isWeeklyOff = !configuredDays.includes(dayOfWeekCode);
      const holiday = holidaysByDate.get(dateStr) || null;

      cells.push({
        isPadding: false,
        dayNumber: day,
        dateStr,
        dayOfWeekCode,
        isWeeklyOff,
        holiday,
        key: dateStr
      });
    }

    return {
      startDayIndex,
      daysInMonth,
      cells
    };
  }, [selectedYear, selectedMonth, holidays, workingDaysStr]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('year', selectedYear);

    setUploading(true);
    try {
      const res = await api.post('/holidays/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`Successfully processed calendar: ${res.addedCount} added, ${res.updatedCount} updated.`);
      fetchHolidays();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Failed to upload holiday calendar.');
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/holidays/template?year=${selectedYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to generate template');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `holidays_${selectedYear}_template.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error('Failed to download sample CSV template');
    }
  };

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!newHoliday.name.trim()) {
      return toast.warning('Please enter a holiday name');
    }

    try {
      await api.post('/holidays', newHoliday);
      toast.success(`Added holiday "${newHoliday.name}"`);
      setShowAddModal(false);
      setNewHoliday({
        date: `${selectedYear}-01-01`,
        name: '',
        type: 'PUBLIC_HOLIDAY'
      });
      fetchHolidays();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Failed to add holiday');
    }
  };

  const openAddForDate = (dateStr) => {
    if (!isAdmin) return;
    setNewHoliday({
      date: dateStr,
      name: '',
      type: 'PUBLIC_HOLIDAY'
    });
    setShowAddModal(true);
  };

  const handleDeleteHoliday = async (id, name, date) => {
    if (!isAdmin) return;
    if (!window.confirm(`Are you sure you want to remove "${name}" on ${date}?`)) return;

    try {
      await api.delete(`/holidays/${id}`);
      toast.success(`Removed "${name}" from holiday calendar`);
      fetchHolidays();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Failed to delete holiday');
    }
  };

  const handleClearYear = async () => {
    if (!isAdmin) return;
    if (!window.confirm(`WARNING: Are you sure you want to delete ALL holidays for ${selectedYear}? Attendance calculations will fall back to standard weekly-off days.`)) return;

    try {
      await api.delete(`/holidays/year/${selectedYear}`);
      toast.success(`Cleared all holidays for ${selectedYear}`);
      fetchHolidays();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Failed to clear holidays');
    }
  };

  const formatDayName = (dateStr) => {
    try {
      const parts = dateStr.split('-');
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString('en-US', { weekday: 'long' });
    } catch {
      return '-';
    }
  };

  const prevMonth = () => {
    setSelectedMonth(prev => (prev === 0 ? 11 : prev - 1));
  };

  const nextMonth = () => {
    setSelectedMonth(prev => (prev === 11 ? 0 : prev + 1));
  };

  return (
    <div className="holiday-calendar-container">
      {/* Top Header / Selector Controls */}
      <div className="holiday-header-bar">
        <div>
          <h3 className="holiday-section-title">
            <CalendarDays size={20} className="text-primary-light" />
            Company Holiday Calendar
          </h3>
          <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
            Visual calendar of declared company holidays enclosed in ZenCube brand colors.
          </p>
        </div>

        {/* Right Header Controls: Month Selector, Year Selector & View Mode Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
          <div className="year-selector-group">
            <label className="filter-label">Month:</label>
            <select 
              className="form-control year-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              style={{ minWidth: '120px' }}
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={idx}>
                  {m} {monthHolidayCounts[idx] > 0 ? `(${monthHolidayCounts[idx]})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="year-selector-group">
            <label className="filter-label">Year:</label>
            <select 
              className="form-control year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            >
              {yearsList.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="view-mode-toggle">
            <button
              type="button"
              className={`view-mode-btn ${viewMode === 'calendar' ? 'active' : ''}`}
              onClick={() => setViewMode('calendar')}
              title="Interactive Visual Calendar"
            >
              <LayoutGrid size={15} />
              <span>Calendar</span>
            </button>
            <button
              type="button"
              className={`view-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table List View"
            >
              <List size={15} />
              <span>Table List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Year Statistics Summary Cards */}
      <div className="holiday-stats-grid">
        <div className="holiday-stat-card">
          <span className="stat-label">Total Declared Holidays ({selectedYear})</span>
          <span className="stat-value text-primary-light">{yearStats.totalHolidays} Days</span>
          <span className="stat-desc">Deducted from absence penalties</span>
        </div>

        <div className="holiday-stat-card">
          <span className="stat-label">Weekly-Off Days ({selectedYear})</span>
          <span className="stat-value">{yearStats.weeklyOffCount} Days</span>
          <span className="stat-desc">Based on system working-days config</span>
        </div>

        <div className="holiday-stat-card">
          <span className="stat-label">Effective Working Days</span>
          <span className="stat-value text-success">{yearStats.workingDaysCount} Days</span>
          <span className="stat-desc">Baseline for attendance %</span>
        </div>
      </div>

      {/* Notice Alert if no holidays configured for this year */}
      {holidays.length === 0 && !loading && (
        <div className="holiday-alert-banner">
          <Info size={18} className="text-muted" />
          <span>
            <strong>Notice:</strong> No holiday calendar has been uploaded for <strong>{selectedYear}</strong>. 
            All attendance calculations for {selectedYear} currently use standard weekly-off days. 
            {isAdmin && ' You can upload a calendar file or click any date on the calendar below to add holidays.'}
          </span>
        </div>
      )}

      {/* Action Toolbar */}
      <div className="holiday-action-toolbar">
        <div className="left-actions">
          {isAdmin && (
            <>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => {
                  const mStr = String(selectedMonth + 1).padStart(2, '0');
                  setNewHoliday({
                    date: `${selectedYear}-${mStr}-01`,
                    name: '',
                    type: 'PUBLIC_HOLIDAY'
                  });
                  setShowAddModal(true);
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
              >
                <Plus size={16} /> Add Holiday
              </button>

              <label 
                className={`btn btn-secondary upload-btn ${uploading ? 'disabled' : ''}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: uploading ? 'not-allowed' : 'pointer' }}
                title="Upload calendar in Excel, Word, PDF, or CSV format"
              >
                <Upload size={16} />
                {uploading ? 'Processing Document...' : `Upload Calendar (Excel, Word, PDF, CSV)`}
                <input 
                  type="file" 
                  accept=".xlsx,.xls,.docx,.pdf,.csv,.txt"
                  disabled={uploading}
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </>
          )}

          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={handleDownloadTemplate}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            title="Download CSV format template"
          >
            <Download size={16} /> Download Template (.csv)
          </button>
        </div>

        {isAdmin && holidays.length > 0 && (
          <button 
            type="button" 
            className="btn-danger-outline"
            onClick={handleClearYear}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem' }}
          >
            <Trash2 size={15} /> Clear {selectedYear} Calendar
          </button>
        )}
      </div>

      {/* ======================================================================
          VIEW MODE 1: VISUAL CALENDAR GRID (ENCLOSED IN ZENCUBE BRAND COLORS)
          ====================================================================== */}
      {viewMode === 'calendar' ? (
        <div className="card zenv-calendar-card">
          {/* Month Navigation Header */}
          <div className="calendar-grid-header">
            <button type="button" className="calendar-nav-btn" onClick={prevMonth} title="Previous Month">
              <ChevronLeft size={18} />
            </button>
            <div className="calendar-month-heading">
              <h4>{MONTH_NAMES[selectedMonth]} {selectedYear}</h4>
              <span className="calendar-month-summary">
                {monthHolidayCounts[selectedMonth]} {monthHolidayCounts[selectedMonth] === 1 ? 'Holiday' : 'Holidays'} in {MONTH_NAMES[selectedMonth]}
              </span>
            </div>
            <button type="button" className="calendar-nav-btn" onClick={nextMonth} title="Next Month">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Days of Week Header */}
          <div className="calendar-weekdays-row">
            {WEEK_DAYS.map(day => (
              <div key={day} className={`weekday-col ${day === 'Sun' ? 'is-sunday' : ''}`}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Month Grid */}
          <div className="calendar-grid-body">
            {calendarMonthData.cells.map((cell) => {
              if (cell.isPadding) {
                return <div key={cell.key} className="calendar-day-cell is-empty" />;
              }

              const hasHoliday = !!cell.holiday;
              const isWeeklyOff = cell.isWeeklyOff;

              return (
                <div 
                  key={cell.key}
                  className={`calendar-day-cell ${hasHoliday ? 'has-holiday' : ''} ${isWeeklyOff ? 'is-weekly-off' : ''}`}
                >
                  {/* Top Day Header */}
                  <div className="day-cell-top">
                    <span className={`day-number ${hasHoliday ? 'holiday-num' : ''}`}>
                      {cell.dayNumber}
                    </span>
                    {hasHoliday && (
                      <span className="holiday-indicator-dot" title="Declared Company Holiday" />
                    )}
                  </div>

                  {/* Holiday Content Badge - Enclosed in ZenCube Brand Color */}
                  {hasHoliday ? (
                    <div className="zencube-holiday-badge">
                      <div className="holiday-badge-header">
                        <span className="holiday-badge-name" title={cell.holiday.holidayName}>
                          {cell.holiday.holidayName}
                        </span>
                        {isAdmin && (
                          <button
                            type="button"
                            className="holiday-badge-del-btn"
                            title="Remove Holiday"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteHoliday(cell.holiday.holidayId, cell.holiday.holidayName, cell.holiday.holidayDate);
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                      <span className="holiday-badge-type">
                        {cell.holiday.holidayType ? cell.holiday.holidayType.replace(/_/g, ' ') : 'PUBLIC HOLIDAY'}
                      </span>
                    </div>
                  ) : isWeeklyOff ? (
                    <div className="weekly-off-tag">
                      <span>Weekly Off</span>
                    </div>
                  ) : (
                    <div className="working-day-placeholder">
                      {isAdmin && (
                        <button
                          type="button"
                          className="quick-add-btn"
                          title={`Set ${cell.dateStr} as a Holiday`}
                          onClick={() => openAddForDate(cell.dateStr)}
                        >
                          <Plus size={13} /> Holiday
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Calendar Legend Bar */}
          <div className="calendar-legend-bar">
            <div className="legend-item">
              <span className="legend-box legend-holiday" />
              <span>Declared Company Holiday (Enclosed in ZenCube Blue)</span>
            </div>
            <div className="legend-item">
              <span className="legend-box legend-weekly-off" />
              <span>Weekly-Off (Non-working day)</span>
            </div>
            <div className="legend-item">
              <span className="legend-box legend-working-day" />
              <span>Regular Working Day</span>
            </div>
          </div>
        </div>
      ) : (
        /* ======================================================================
            VIEW MODE 2: TABLE LIST VIEW
            ====================================================================== */
        <div className="card holiday-table-card">
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Date</th>
                  <th style={{ width: '130px' }}>Day</th>
                  <th>Holiday Name</th>
                  <th style={{ width: '160px' }}>Type</th>
                  {isAdmin && <th style={{ width: '90px', textAlign: 'center' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={isAdmin ? 5 : 4} style={{ textAlign: 'center', padding: '2rem' }}>
                      Loading {selectedYear} holidays...
                    </td>
                  </tr>
                ) : holidays.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 5 : 4} style={{ textAlign: 'center', padding: '2.5rem' }} className="text-muted">
                      No declared holidays for {selectedYear}. Use "Upload Calendar" or "Add Holiday" to configure holidays for this year.
                    </td>
                  </tr>
                ) : (
                  holidays.map((h) => (
                    <tr key={h.holidayId}>
                      <td className="font-medium" style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                        {h.holidayDate}
                      </td>
                      <td className="text-muted">
                        {formatDayName(h.holidayDate)}
                      </td>
                      <td className="font-semibold" style={{ color: 'var(--color-primary)' }}>
                        {h.holidayName}
                      </td>
                      <td>
                        <span className={`badge ${
                          h.holidayType === 'PUBLIC_HOLIDAY' 
                            ? 'badge-primary' 
                            : h.holidayType === 'COMPANY_OFF' 
                            ? 'badge-info' 
                            : 'badge-secondary'
                        }`} style={{ fontSize: '0.75rem' }}>
                          {h.holidayType ? h.holidayType.replace(/_/g, ' ') : 'PUBLIC HOLIDAY'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="icon-action-btn delete-btn"
                            title="Delete Holiday"
                            onClick={() => handleDeleteHoliday(h.holidayId, h.holidayName, h.holidayDate)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Holiday Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h4>Add Company Holiday ({selectedYear})</h4>
              <button type="button" className="close-btn" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddHoliday}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={newHoliday.date}
                    onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Holiday Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Independence Day, Annual Company Off"
                    value={newHoliday.name}
                    onChange={e => setNewHoliday({ ...newHoliday, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Holiday Type</label>
                  <select
                    className="form-control"
                    value={newHoliday.type}
                    onChange={e => setNewHoliday({ ...newHoliday, type: e.target.value })}
                  >
                    <option value="PUBLIC_HOLIDAY">Public Holiday</option>
                    <option value="COMPANY_OFF">Company Declared Off</option>
                    <option value="RESTRICTED_HOLIDAY">Restricted / Optional Holiday</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

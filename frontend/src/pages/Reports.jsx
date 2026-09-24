import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Download, Calendar, List, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';
import {
  ZenvDownloadIcon,
  ZenvSearchIcon,
  ZenvCalendarIcon,
  ZenvReportIcon,
  ZenvEditIcon
} from '../components/ZenvIcons';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useRefresh, useAutoRefresh } from '../context/RefreshContext';
import { formatTime, formatHours, formatMinutesToHours } from '../utils/dateUtils';
import './Reports.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function Reports() {
  const { user } = useAuth();
  const toast = useToast();
  const { triggerRefresh } = useRefresh();
  const location = useLocation();

  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMemberType, setSelectedMemberType] = useState('ALL');
  const [selectedGroupLabel, setSelectedGroupLabel] = useState('ALL');
  const [selectedStatusTab, setSelectedStatusTab] = useState('ACTIVE');

  // Default to current month or incoming location.state
  const now = new Date();
  const currentMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const currentToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const [startDate, setStartDate] = useState(location.state?.startDate || currentMonthStart);
  const [endDate, setEndDate] = useState(location.state?.endDate || currentToday);
  const [attendanceFilter, setAttendanceFilter] = useState(location.state?.attendanceFilter || 'ALL');

  useEffect(() => {
    if (location.state?.startDate && location.state?.endDate) {
      setStartDate(location.state.startDate);
      setEndDate(location.state.endDate);
      if (location.state.attendanceFilter) {
        setAttendanceFilter(location.state.attendanceFilter);
      }
    }
  }, [location.state]);

  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [personSessions, setPersonSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [personViewMode, setPersonViewMode] = useState('calendar'); // 'calendar' | 'sheet'
  const [sheetFilter, setSheetFilter] = useState('ALL');
  const [modalMonth, setModalMonth] = useState(now.getMonth());
  const [modalYear, setModalYear] = useState(now.getFullYear());

  const [showAbsencesModal, setShowAbsencesModal] = useState(false);
  const [selectedAbsencePerson, setSelectedAbsencePerson] = useState(null);

  const [holidays, setHolidays] = useState([]);
  const [systemConfig, setSystemConfig] = useState(null);

  useEffect(() => {
    api.get('/holidays').then(data => setHolidays(data || [])).catch(() => {});
    api.get('/config').then(data => setSystemConfig(data || null)).catch(() => {});
  }, []);

  const [correctionMode, setCorrectionMode] = useState(null);
  const [correctionForm, setCorrectionForm] = useState({ checkOutAt: '', correctionReason: '' });

  const fetchReport = useCallback(async () => {
    if (user?.passwordChangeRequired) return;
    try {
      const data = await api.get(`/attendance/report?startDate=${startDate}&endDate=${endDate}`);
      setReportData(data || []);
    } catch (err) {
      console.error('Failed to fetch report', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, user?.passwordChangeRequired]);

  useAutoRefresh(fetchReport, { intervalMs: 10000 });

  const handleExportCSV = async () => {
    try {
      let exportUrl = `/api/attendance/report/export?startDate=${startDate}&endDate=${endDate}`;
      if (selectedMemberType !== 'ALL') {
        exportUrl += `&memberType=${selectedMemberType}`;
      }
      if (selectedGroupLabel !== 'ALL') {
        exportUrl += `&groupLabel=${encodeURIComponent(selectedGroupLabel)}`;
      }

      const response = await fetch(exportUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_report_${startDate}_to_${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Attendance report downloaded successfully!");
    } catch (err) {
      console.error("Failed to download CSV report", err);
      toast.error("Failed to download CSV report");
    }
  };

  const openSessionsModal = async (person) => {
    setSelectedPerson(person);
    setCorrectionMode(null);
    setPersonViewMode('calendar');

    try {
      const parts = startDate.split('-');
      setModalYear(parseInt(parts[0], 10));
      setModalMonth(parseInt(parts[1], 10) - 1);
    } catch {
      setModalYear(now.getFullYear());
      setModalMonth(now.getMonth());
    }

    setShowSessionsModal(true);
    setSessionsLoading(true);
    try {
      const data = await api.get(`/people/${person.personId}/attendance`);
      setPersonSessions(data || []);
    } catch (err) {
      console.error("Failed to load attendance sessions", err);
      toast.error("Failed to load attendance sessions");
    } finally {
      setSessionsLoading(false);
    }
  };

  const prevModalMonth = () => {
    setModalMonth(prev => {
      if (prev === 0) {
        setModalYear(y => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const nextModalMonth = () => {
    setModalMonth(prev => {
      if (prev === 11) {
        setModalYear(y => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const personSheetData = useMemo(() => {
    if (!selectedPerson) {
      return {
        rows: [],
        stats: { totalDays: 0, totalPresent: 0, totalAbsent: 0, totalHolidays: 0, totalWeekends: 0, totalHours: '0.00', workingDays: 0, attendanceRate: 0 }
      };
    }

    const holidayMap = new Map();
    (holidays || []).forEach(h => {
      holidayMap.set(h.holidayDate, h);
    });
    const workingDaysSet = new Set((systemConfig?.workingDays || 'MON,TUE,WED,THU,FRI').split(',').map(s => s.trim().toUpperCase()));
    const joinDateStr = selectedPerson.joiningDate || (selectedPerson.createdAt ? selectedPerson.createdAt.split('T')[0] : null);

    const startD = new Date(startDate);
    const endD = new Date(endDate);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const shortDayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    const presentSet = new Set(selectedPerson.presentDates || []);
    const absentSet = new Set(selectedPerson.absentDates || []);
    const sessionsByDate = new Map();
    (personSessions || []).forEach(s => {
      sessionsByDate.set(s.workDate, s);
    });

    const rows = [];
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalHolidays = 0;
    let totalWeekends = 0;
    let totalMinutes = 0;

    for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      const dStr = `${y}-${m}-${dayNum}`;
      const dayIdx = d.getDay();
      const dayName = dayNames[dayIdx];
      const shortDay = shortDayNames[dayIdx];
      const isWorkingDay = workingDaysSet.has(shortDay);
      const holiday = holidayMap.get(dStr);
      const isBeforeJoining = joinDateStr ? dStr < joinDateStr : false;

      const session = sessionsByDate.get(dStr);
      let statusType = 'WEEKEND'; // 'PRESENT' | 'ABSENT' | 'HOLIDAY' | 'WEEKEND' | 'NOT_JOINED'
      let statusLabel = 'WEEKEND / OFF';

      if (presentSet.has(dStr) || (session && (session.durationMinutes > 0 || session.status === 'OPEN'))) {
        statusType = 'PRESENT';
        statusLabel = holiday ? `PRESENT (HOLIDAY)` : (!isWorkingDay ? `PRESENT (${shortDay})` : 'PRESENT');
        totalPresent++;
      } else if (holiday) {
        statusType = 'HOLIDAY';
        statusLabel = holiday.holidayName || 'HOLIDAY';
        totalHolidays++;
      } else if (absentSet.has(dStr)) {
        statusType = 'ABSENT';
        statusLabel = 'ABSENT';
        totalAbsent++;
      } else if (isBeforeJoining) {
        statusType = 'NOT_JOINED';
        statusLabel = 'NOT JOINED';
      } else if (!isWorkingDay) {
        statusType = 'WEEKEND';
        statusLabel = 'WEEKEND / OFF';
        totalWeekends++;
      }

      if (session?.durationMinutes) {
        totalMinutes += session.durationMinutes;
      }

      rows.push({
        date: dStr,
        day: dayName,
        shortDay,
        isWorkingDay,
        isHoliday: !!holiday,
        holidayName: holiday?.holidayName,
        holidayType: holiday?.holidayType,
        isBeforeJoining,
        statusType,
        statusLabel,
        checkInAt: session?.checkInAt,
        checkOutAt: session?.checkOutAt,
        durationMinutes: session?.durationMinutes || 0,
        isLate: session?.isLate || false,
        sessionStatus: session?.status || null,
        sessionId: session?.sessionId || null,
        session
      });
    }

    return {
      rows,
      stats: {
        totalDays: rows.length,
        totalPresent,
        totalAbsent,
        totalHolidays,
        totalWeekends,
        totalHours: (totalMinutes / 60).toFixed(2),
        workingDays: selectedPerson.expectedWorkingDays || 0,
        attendanceRate: selectedPerson.attendanceRate || 0
      }
    };
  }, [startDate, endDate, selectedPerson, personSessions, holidays, systemConfig]);

  const filteredSheetRows = useMemo(() => {
    const all = personSheetData.rows || [];
    if (sheetFilter === 'ALL') return all;
    if (sheetFilter === 'PRESENT') return all.filter(r => r.statusType === 'PRESENT');
    if (sheetFilter === 'ABSENT') return all.filter(r => r.statusType === 'ABSENT');
    if (sheetFilter === 'HOLIDAY') return all.filter(r => r.statusType === 'HOLIDAY');
    if (sheetFilter === 'WORKING_DAYS') return all.filter(r => r.isWorkingDay && !r.isHoliday);
    return all;
  }, [personSheetData, sheetFilter]);

  const handleDownloadPersonAttendance = () => {
    if (!selectedPerson) return;
    try {
      const { rows, stats } = personSheetData;
      const csvRows = [];
      csvRows.push(['ZENV QUANTUM ACCESS-TRACK - ATTENDANCE REPORT SHEET']);
      csvRows.push(['Generated On', new Date().toLocaleString()]);
      csvRows.push([]);
      csvRows.push(['CANDIDATE INFORMATION']);
      csvRows.push(['Candidate ID', selectedPerson.externalRef || selectedPerson.personId]);
      csvRows.push(['Candidate Name', selectedPerson.fullName]);
      csvRows.push(['Role / Type', selectedPerson.memberType]);
      csvRows.push(['Team / Department', selectedPerson.groupLabel || 'N/A']);
      csvRows.push(['Joining Date', selectedPerson.joiningDate || 'N/A']);
      csvRows.push(['Report Period', `${startDate} to ${endDate}`]);
      csvRows.push([]);
      csvRows.push(['ATTENDANCE SUMMARY METRICS']);
      csvRows.push(['Total Calendar Days', stats.totalDays]);
      csvRows.push(['Expected Working Days', stats.workingDays]);
      csvRows.push(['Days Present', stats.totalPresent]);
      csvRows.push(['Days Absent', stats.totalAbsent]);
      csvRows.push(['Holidays in Period', stats.totalHolidays]);
      csvRows.push(['Weekends / Off Days', stats.totalWeekends]);
      csvRows.push(['Total Hours Worked', `${stats.totalHours} hrs`]);
      csvRows.push(['Attendance Rate', `${stats.attendanceRate}%`]);
      csvRows.push([]);
      csvRows.push(['ATTENDANCE SHEET DETAILS']);
      csvRows.push(['DATE', 'DAY', 'STATUS', 'CHECK IN', 'CHECK OUT', 'DURATION (HOURS)', 'LATE ARRIVAL', 'CHECKOUT STATUS']);

      rows.forEach(r => {
        const checkIn = r.checkInAt ? formatTime(r.checkInAt) : '-';
        const checkOut = r.checkOutAt ? formatTime(r.checkOutAt) : '-';
        const duration = r.durationMinutes > 0 ? (r.durationMinutes / 60).toFixed(2) : '-';
        const late = r.isLate ? 'YES (LATE)' : (r.statusType === 'PRESENT' ? 'NO' : '-');
        const checkoutStatus = r.sessionStatus === 'AUTO_CLOSED' ? 'AUTO_CHECKOUT' : (r.sessionStatus || '-');
        csvRows.push([r.date, r.day, r.statusLabel, checkIn, checkOut, duration, late, checkoutStatus]);
      });

      const csvContent = csvRows
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_sheet_${selectedPerson.externalRef || selectedPerson.fullName}_${startDate}_to_${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded Attendance CSV for ${selectedPerson.fullName}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to download attendance data');
    }
  };

  const handleDownloadPersonExcel = () => {
    if (!selectedPerson) return;
    try {
      const { rows, stats } = personSheetData;
      let tableRowsHtml = '';
      rows.forEach(r => {
        const checkIn = r.checkInAt ? formatTime(r.checkInAt) : '-';
        const checkOut = r.checkOutAt ? formatTime(r.checkOutAt) : '-';
        const duration = r.durationMinutes > 0 ? `${(r.durationMinutes / 60).toFixed(2)} hrs` : '-';
        const late = r.isLate ? '<span style="color:#c2410c;font-weight:bold;">LATE</span>' : (r.statusType === 'PRESENT' ? 'On Time' : '-');
        const checkoutStatus = r.sessionStatus === 'AUTO_CLOSED' ? '<span style="color:#b91c1c;font-weight:bold;">Auto Checkout</span>' : (r.sessionStatus === 'CLOSED' ? '<span style="color:#047857;">Completed</span>' : (r.sessionStatus || '-'));

        let statusStyle = 'text-align:center;font-weight:bold;padding:7px;border:1px solid #cbd5e1;';
        if (r.statusType === 'PRESENT') {
          statusStyle += 'background-color:#d1fae5;color:#065f46;';
        } else if (r.statusType === 'ABSENT') {
          statusStyle += 'background-color:#fee2e2;color:#991b1b;';
        } else if (r.statusType === 'HOLIDAY') {
          statusStyle += 'background-color:#f3e8ff;color:#6b21a8;';
        } else {
          statusStyle += 'background-color:#f8fafc;color:#64748b;';
        }

        tableRowsHtml += `
          <tr>
            <td style="text-align:center;font-family:monospace;font-weight:bold;border:1px solid #cbd5e1;padding:7px;">${r.date}</td>
            <td style="text-align:center;border:1px solid #cbd5e1;padding:7px;">${r.day}</td>
            <td style="${statusStyle}">${r.statusLabel}</td>
            <td style="text-align:center;border:1px solid #cbd5e1;padding:7px;">${checkIn}</td>
            <td style="text-align:center;border:1px solid #cbd5e1;padding:7px;">${checkOut}</td>
            <td style="text-align:right;font-weight:600;border:1px solid #cbd5e1;padding:7px;">${duration}</td>
            <td style="text-align:center;border:1px solid #cbd5e1;padding:7px;">${late}</td>
            <td style="text-align:center;border:1px solid #cbd5e1;padding:7px;">${checkoutStatus}</td>
          </tr>
        `;
      });

      const excelTemplate = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8">
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Attendance Sheet</x:Name>
                  <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #1e293b; }
            table { border-collapse: collapse; width: 100%; }
            .header-banner { background-color: #0f172a; color: #ffffff; font-size: 14pt; font-weight: bold; text-align: center; padding: 12px; }
            .meta-th { background-color: #f1f5f9; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px; text-align: left; }
            .meta-td { border: 1px solid #cbd5e1; padding: 6px; }
            .col-header { background-color: #1e293b; color: #ffffff; font-weight: bold; text-align: center; padding: 8px; border: 1px solid #0f172a; text-transform: uppercase; font-size: 9pt; }
          </style>
        </head>
        <body>
          <table>
            <tr><th colspan="8" class="header-banner">ZENV QUANTUM — CANDIDATE ATTENDANCE SHEET</th></tr>
            <tr>
              <td class="meta-th">Candidate ID:</td><td class="meta-td">${selectedPerson.externalRef || selectedPerson.personId}</td>
              <td class="meta-th">Candidate Name:</td><td class="meta-td"><b>${selectedPerson.fullName}</b></td>
              <td class="meta-th">Role / Type:</td><td class="meta-td">${selectedPerson.memberType}</td>
              <td class="meta-th">Team:</td><td class="meta-td">${selectedPerson.groupLabel || 'N/A'}</td>
            </tr>
            <tr>
              <td class="meta-th">Report Period:</td><td class="meta-td">${startDate} to ${endDate}</td>
              <td class="meta-th">Expected Working Days:</td><td class="meta-td"><b>${stats.workingDays}</b></td>
              <td class="meta-th">Days Present:</td><td class="meta-td" style="color:#047857;font-weight:bold;">${stats.totalPresent}</td>
              <td class="meta-th">Days Absent:</td><td class="meta-td" style="color:#b91c1c;font-weight:bold;">${stats.totalAbsent}</td>
            </tr>
            <tr>
              <td class="meta-th">Holidays in Period:</td><td class="meta-td" style="color:#7e22ce;font-weight:bold;">${stats.totalHolidays}</td>
              <td class="meta-th">Total Hours Logged:</td><td class="meta-td"><b>${stats.totalHours} hrs</b></td>
              <td class="meta-th">Attendance Rate:</td><td class="meta-td" style="color:#0284c7;font-weight:bold;">${stats.attendanceRate}%</td>
              <td class="meta-th">Joining Date:</td><td class="meta-td">${selectedPerson.joiningDate || 'N/A'}</td>
            </tr>
            <tr><td colspan="8" style="height:12px;"></td></tr>
            <thead>
              <tr>
                <th class="col-header" style="width:110px;">Date</th>
                <th class="col-header" style="width:110px;">Day</th>
                <th class="col-header" style="width:180px;">Attendance Status</th>
                <th class="col-header" style="width:110px;">Check In</th>
                <th class="col-header" style="width:110px;">Check Out</th>
                <th class="col-header" style="width:120px;">Duration</th>
                <th class="col-header" style="width:100px;">Late</th>
                <th class="col-header" style="width:130px;">Checkout Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_sheet_${selectedPerson.externalRef || selectedPerson.fullName}_${startDate}_to_${endDate}.xls`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded styled Excel Attendance Sheet for ${selectedPerson.fullName}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to download Excel sheet');
    }
  };

  const modalCalendarData = useMemo(() => {
    if (!selectedPerson) return { cells: [], modalHolidaysCount: 0 };
    const firstDay = new Date(modalYear, modalMonth, 1);
    const lastDay = new Date(modalYear, modalMonth + 1, 0);
    const daysInMonth = lastDay.getDate();

    let startDayIndex = firstDay.getDay() - 1;
    if (startDayIndex === -1) startDayIndex = 6;

    const presentSet = new Set(selectedPerson.presentDates || []);
    const absentSet = new Set(selectedPerson.absentDates || []);
    const sessionsByDate = new Map();
    (personSessions || []).forEach(s => {
      sessionsByDate.set(s.workDate, s);
    });

    const holidayMap = new Map();
    (holidays || []).forEach(h => {
      holidayMap.set(h.holidayDate, h);
    });
    const workingDaysSet = new Set((systemConfig?.workingDays || 'MON,TUE,WED,THU,FRI').split(',').map(s => s.trim().toUpperCase()));
    const shortDayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const joinDateStr = selectedPerson.joiningDate || (selectedPerson.createdAt ? selectedPerson.createdAt.split('T')[0] : null);

    const cells = [];
    for (let i = 0; i < startDayIndex; i++) {
      cells.push({ isPadding: true, key: `pad-${i}` });
    }

    let modalHolidaysCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const monthStr = String(modalMonth + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${modalYear}-${monthStr}-${dayStr}`;

      const dObj = new Date(modalYear, modalMonth, day);
      const dayOfWeek = shortDayNames[dObj.getDay()];
      const isWorkingDay = workingDaysSet.has(dayOfWeek);
      const holiday = holidayMap.get(dateStr);
      const isHoliday = !!holiday;
      if (isHoliday) {
        modalHolidaysCount++;
      }

      const session = sessionsByDate.get(dateStr);
      const isPresent = presentSet.has(dateStr) || (session && (session.durationMinutes > 0 || session.status === 'OPEN'));
      const isAbsent = !isPresent && absentSet.has(dateStr);
      const isWeekend = !isWorkingDay && !isHoliday;
      const isBeforeJoining = joinDateStr ? dateStr < joinDateStr : false;

      cells.push({
        isPadding: false,
        day,
        dateStr,
        dayOfWeek,
        isWorkingDay,
        isHoliday,
        holidayName: holiday?.holidayName,
        holidayType: holiday?.holidayType,
        isWeekend,
        isBeforeJoining,
        isPresent,
        isAbsent,
        session,
        key: dateStr
      });
    }

    return {
      daysInMonth,
      cells,
      modalHolidaysCount
    };
  }, [modalYear, modalMonth, selectedPerson, personSessions, holidays, systemConfig]);

  const handleCorrectionSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        correctionReason: correctionForm.correctionReason
      };

      if (correctionForm.checkOutAt) {
        // Assume checkOutAt input is datetime-local (YYYY-MM-DDTHH:mm)
        // Convert to ISO_LOCAL_DATE_TIME expected by backend (YYYY-MM-DDTHH:mm:ss)
        payload.checkOutAt = correctionForm.checkOutAt + ":00";
      }

      await api.patch(`/attendance/sessions/${correctionMode}`, payload);
      setCorrectionMode(null);
      // Refresh sessions
      const data = await api.get(`/people/${selectedPerson.personId}/attendance`);
      setPersonSessions(data || []);
      fetchReport(); // Also refresh the main report to update hours
      toast.success("Session corrected successfully.");
    } catch (err) {
      toast.error(err?.message || "Failed to correct session");
    }
  };

  const hasNoTeam = reportData.some(row => !row.groupLabel || row.groupLabel.trim() === '' || row.groupLabel === 'N/A');
  const baseGroupLabels = Array.from(new Set(reportData.map(row => row.groupLabel).filter(g => g && g.trim() !== '' && g !== 'N/A'))).sort();
  const uniqueGroupLabels = hasNoTeam ? [...baseGroupLabels, 'N/A'] : baseGroupLabels;

  const availableMemberTypes = Array.from(new Set([
    'EMPLOYEE', 'STUDENT',
    ...reportData.map(row => row.memberType).filter(t => t && t !== 'N/A' && t !== 'NA')
  ])).sort();

  const getMemberTypeCount = (type) => {
    return reportData.filter(r => r.memberType === type).length;
  };

  const activeCount = reportData.filter(r => r.status === 'ACTIVE').length;
  const completedCount = reportData.filter(r => r.status === 'COMPLETED').length;
  const inactiveCount = reportData.filter(r => r.status === 'INACTIVE').length;

  const filteredData = reportData.filter(row => {
    const matchesSearch = searchTerm === '' ||
      row.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.externalRef?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (row.groupLabel || 'N/A').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMemberType = selectedMemberType === 'ALL' || row.memberType === selectedMemberType;

    const matchesGroupLabel = selectedGroupLabel === 'ALL' ||
      (selectedGroupLabel === 'N/A'
        ? (!row.groupLabel || row.groupLabel.trim() === '' || row.groupLabel === 'N/A')
        : row.groupLabel === selectedGroupLabel);

    const matchesStatus = selectedStatusTab === 'ALL' || row.status === selectedStatusTab;

    const matchesAttendance = attendanceFilter === 'ALL' ||
      (attendanceFilter === 'LATE_OR_ABSENT' && ((row.lateCount || 0) > 0 || (row.absentDays || 0) > 0)) ||
      (attendanceFilter === 'LATE' && (row.lateCount || 0) > 0) ||
      (attendanceFilter === 'ABSENT' && (row.absentDays || 0) > 0) ||
      (attendanceFilter === 'PRESENT' && (row.daysPresent || 0) > 0);

    return matchesSearch && matchesMemberType && matchesGroupLabel && matchesStatus && matchesAttendance;
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Attendance Reports</h1>
          <p className="text-muted">Generate, view, and export attendance data.</p>
        </div>
        <button className="btn btn-primary" onClick={handleExportCSV} style={{ display: 'inline-flex', alignItems: 'center' }}>
          <span>Export to CSV</span>
        </button>
      </div>

      <div className="card">
        <div className="table-toolbar" style={{ flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div className="search-bar table-search" style={{ flex: '1 1 200px', marginBottom: 0 }}>
            <ZenvSearchIcon size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by name, ID, team..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Member Type Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 500 }}>Type:</span>
              <select
                className="form-control"
                style={{ padding: '0.25rem 0.5rem', minWidth: '130px' }}
                value={selectedMemberType}
                onChange={(e) => setSelectedMemberType(e.target.value)}
              >
                <option value="ALL">All Types ({reportData.length})</option>
                {availableMemberTypes.map(type => (
                  <option key={type} value={type}>
                    {type === 'EMPLOYEE' ? 'Employee' : type === 'STUDENT' ? 'Student' : type} ({getMemberTypeCount(type)})
                  </option>
                ))}
              </select>
            </div>

            {/* Group / Team Label Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 500 }}>Team:</span>
              <select
                className="form-control"
                style={{ padding: '0.25rem 0.5rem', minWidth: '110px' }}
                value={selectedGroupLabel}
                onChange={(e) => setSelectedGroupLabel(e.target.value)}
              >
                <option value="ALL">All Teams</option>
                {uniqueGroupLabels.map(group => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </div>

            {/* Attendance Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 500 }}>Filter:</span>
              <select
                className="form-control"
                style={{ padding: '0.25rem 0.5rem', minWidth: '150px' }}
                value={attendanceFilter}
                onChange={(e) => setAttendanceFilter(e.target.value)}
              >
                <option value="ALL">All Attendance</option>
                <option value="LATE_OR_ABSENT">Late or Absent</option>
                <option value="LATE">Late Only</option>
                <option value="ABSENT">Absent Only</option>
                <option value="PRESENT">Present Only</option>
              </select>
            </div>

            {/* Status Dropdown Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 500 }}>Status:</span>
              <select
                className="form-control"
                style={{ padding: '0.25rem 0.5rem', minWidth: '150px' }}
                value={selectedStatusTab}
                onChange={(e) => setSelectedStatusTab(e.target.value)}
              >
                <option value="ACTIVE">Active ({activeCount})</option>
                <option value="COMPLETED">Completed ({completedCount})</option>
                <option value="INACTIVE">Inactive ({inactiveCount})</option>
                <option value="ALL">All Status ({reportData.length})</option>
              </select>
            </div>

            {/* Date Range */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ZenvCalendarIcon size={15} className="text-muted" />
              <input
                type="date"
                className="form-control"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.82rem' }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="text-muted" style={{ fontSize: '0.82rem' }}>to</span>
              <input
                type="date"
                className="form-control"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.82rem' }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Active Filter Banner when viewing Today's Late/Absent */}
        {attendanceFilter === 'LATE_OR_ABSENT' && startDate === currentToday && endDate === currentToday && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(180, 83, 9, 0.08)',
            border: '1px solid rgba(180, 83, 9, 0.25)',
            color: '#92400e',
            padding: '0.5rem 0.85rem',
            borderRadius: 'var(--border-radius-sm, 2px)',
            marginBottom: '0.85rem',
            fontSize: '0.825rem'
          }}>
            <span>
              <strong>Showing Today's Late / Absent List ({currentToday}):</strong> Displaying only members who were late or absent today.
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.18rem 0.55rem', fontSize: '0.75rem' }}
              onClick={() => {
                setStartDate(currentMonthStart);
                setEndDate(currentToday);
                setAttendanceFilter('ALL');
              }}
            >
              Reset to Full Month
            </button>
          </div>
        )}

        <div className="data-table-container">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>Loading reports...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ whiteSpace: 'nowrap', minWidth: '105px' }}>ID</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Team</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Attendance %</th>
                  <th>Under Hours</th>
                  <th>Late</th>
                  <th>Checkouts</th>
                  <th>Total Hours</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, i) => (
                  <tr key={i}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className="ext-id-badge">
                        {row.externalRef || `EXT-${String(row.personId).padStart(4, '0')}`}
                      </span>
                    </td>
                    <td className="font-medium">
                      {row.fullName || 'N/A'}
                      {row.status === 'INACTIVE' && (
                        <span className="badge badge-danger" style={{ marginLeft: '8px', fontSize: '0.7rem' }}>
                          INACTIVE
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{
                        fontSize: '0.85rem',
                        fontWeight: row.memberType ? 500 : 600,
                        color: row.memberType ? 'inherit' : 'var(--color-text-muted)'
                      }}>
                        {row.memberType ? (row.memberType === 'EMPLOYEE' ? 'Employee' : row.memberType === 'STUDENT' ? 'Student' : row.memberType) : 'N/A'}
                      </span>
                    </td>
                    <td>{row.groupLabel || 'N/A'}</td>
                    <td><span className="text-success font-medium">{row.daysPresent || 0}</span></td>
                    <td>
                      {row.absentDays > 0 ? (
                        <button
                          className="badge-zenv-absent-btn"
                          onClick={() => {
                            setSelectedAbsencePerson(row);
                            setShowAbsencesModal(true);
                          }}
                          title="Click to view specific dates missed"
                        >
                          {row.absentDays} {row.absentDays === 1 ? 'day' : 'days'}
                        </button>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>0 days</span>
                      )}
                    </td>
                    <td>
                      <span className="badge" style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        background: (row.attendanceRate || 0) >= 80 ? 'rgba(30, 85, 109, 0.12)' : (row.attendanceRate || 0) >= 60 ? 'rgba(151, 144, 133, 0.18)' : 'rgba(212, 85, 41, 0.12)',
                        color: (row.attendanceRate || 0) >= 80 ? 'var(--color-primary-light)' : (row.attendanceRate || 0) >= 60 ? 'var(--color-warning)' : 'var(--color-danger)'
                      }}>
                        {row.attendanceRate !== undefined && row.attendanceRate !== null ? `${row.attendanceRate}%` : '-'}
                      </span>
                    </td>
                    <td>
                      {(row.underHoursDays || 0) > 0 ? (
                        <span
                          className="badge-zenv-underhours"
                          title="Tapped in but worked less than the minimum required hours"
                        >
                          {row.underHoursDays} {row.underHoursDays === 1 ? 'day' : 'days'}
                        </span>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>0 days</span>
                      )}
                    </td>
                    <td><span className="text-warning font-medium">{row.lateCount || 0}</span></td>
                    <td>
                      {row.missedCheckouts > 0 ? (
                        <span className="badge-zenv-missed">
                          {row.missedCheckouts} Missed
                        </span>
                      ) : (
                        0
                      )}
                    </td>
                    <td>{formatHours(row.totalHours)}</td>
                    <td>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }} 
                        onClick={() => openSessionsModal(row)}
                        title="View Attendance Calendar & Sessions"
                      >
                        <ZenvReportIcon size={14} /> Sessions & Calendar
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan="12" style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">
                      {attendanceFilter === 'LATE_OR_ABSENT'
                        ? 'No late or absent personnel found for the selected period.'
                        : 'No attendance data found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showSessionsModal && selectedPerson && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '920px', width: '94%' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <h2 className="modal-title" style={{ margin: 0, fontSize: '1.25rem' }}>
                  {selectedPerson.fullName} {selectedPerson.externalRef ? `(${selectedPerson.externalRef})` : ''}
                </h2>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.825rem', marginTop: '0.2rem' }}>
                  {selectedPerson.memberType ? (selectedPerson.memberType === 'EMPLOYEE' ? 'Employee' : selectedPerson.memberType === 'STUDENT' ? 'Student' : selectedPerson.memberType) : ''} • {selectedPerson.groupLabel || 'No Team'} • Range: {startDate} to {endDate}
                </div>
              </div>

              {/* Right Side Header Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                {/* Download Color-Formatted Excel Sheet */}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleDownloadPersonExcel}
                  title="Download Color-Formatted Excel Spreadsheet (.xls)"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', padding: '0.38rem 0.75rem', borderColor: '#10b981', color: '#047857' }}
                >
                  <FileSpreadsheet size={14} />
                  <span>Download Excel Sheet</span>
                </button>

                {/* Download CSV */}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleDownloadPersonAttendance}
                  title="Download Attendance Data (CSV)"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', padding: '0.38rem 0.75rem' }}
                >
                  <Download size={14} />
                  <span>Download CSV</span>
                </button>

                {/* Attendance Calendar / Attendance Sheet Switcher */}
                <div className="person-view-toggle">
                  <button
                    type="button"
                    className={`person-toggle-btn ${personViewMode === 'calendar' ? 'active' : ''}`}
                    onClick={() => setPersonViewMode('calendar')}
                    title="Attendance Calendar View"
                  >
                    <Calendar size={14} />
                    <span>Attendance Calendar</span>
                  </button>
                  <button
                    type="button"
                    className={`person-toggle-btn ${personViewMode === 'sheet' ? 'active' : ''}`}
                    onClick={() => setPersonViewMode('sheet')}
                    title="Attendance Sheet Table View"
                  >
                    <FileSpreadsheet size={14} />
                    <span>Attendance Sheet</span>
                  </button>
                </div>

                <button className="modal-close" onClick={() => setShowSessionsModal(false)}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Attendance Calendar View */}
            {personViewMode === 'calendar' ? (
              <div className="person-cal-card">
                {/* Month navigation */}
                <div className="person-cal-nav">
                  <button type="button" className="person-cal-nav-btn" onClick={prevModalMonth} title="Previous Month">
                    <ChevronLeft size={16} />
                  </button>
                  <h4 className="person-cal-month-title">
                    {MONTH_NAMES[modalMonth]} {modalYear}
                  </h4>
                  <button type="button" className="person-cal-nav-btn" onClick={nextModalMonth} title="Next Month">
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Weekdays row */}
                <div className="person-cal-weekdays">
                  {WEEK_DAYS.map(w => (
                    <div key={w}>{w}</div>
                  ))}
                </div>

                {/* Calendar Days Grid */}
                <div className="person-cal-grid">
                  {modalCalendarData.cells.map(cell => {
                    if (cell.isPadding) {
                      return <div key={cell.key} className="person-cal-cell is-padding" />;
                    }

                    return (
                      <div 
                        key={cell.key} 
                        className={`person-cal-cell ${cell.isPresent ? 'cell-present' : ''} ${cell.isAbsent ? 'cell-absent' : ''} ${cell.isHoliday ? 'cell-holiday' : ''} ${cell.isWeekend ? 'cell-weekend' : ''}`}
                      >
                        <div className="person-cal-day-num">{cell.day}</div>
                        {cell.isPresent ? (
                          <div 
                            className={`badge-present-enclosed ${cell.isHoliday ? 'badge-present-holiday' : ''}`} 
                            title={cell.isHoliday ? `Present on Holiday: ${cell.holidayName}` : (cell.session ? `Check In: ${formatTime(cell.session.checkInAt)}` : 'Marked Present')}
                          >
                            {cell.isHoliday ? 'Present (Holiday)' : 'Present'}
                          </div>
                        ) : cell.isHoliday ? (
                          <div 
                            className="badge-holiday-enclosed" 
                            title={`Holiday: ${cell.holidayName || 'Company Holiday'}`}
                          >
                            {cell.holidayName || 'Holiday'}
                          </div>
                        ) : cell.isAbsent ? (
                          <div 
                            className="badge-absent-enclosed" 
                            title="Marked Absent on Working Day"
                          >
                            Absent
                          </div>
                        ) : cell.isWeekend ? (
                          <div 
                            className="badge-weekend-enclosed" 
                            title={`Non-working Day (${cell.dayOfWeek})`}
                          >
                            Off
                          </div>
                        ) : cell.isBeforeJoining ? (
                          <div 
                            className="badge-prejoin-enclosed" 
                            title={`Joined on ${selectedPerson.joiningDate}`}
                          >
                            Not Joined
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {/* Legend & Stats */}
                <div className="person-cal-legend">
                  <div className="person-cal-legend-items">
                    <div className="person-cal-legend-badge">
                      <span className="person-cal-legend-box" style={{ background: 'rgba(16, 185, 129, 0.18)', border: '2px solid #10b981' }} />
                      <span style={{ color: '#047857' }}>Present ({selectedPerson.daysPresent || 0} days)</span>
                    </div>
                    <div className="person-cal-legend-badge">
                      <span className="person-cal-legend-box" style={{ background: 'rgba(239, 68, 68, 0.18)', border: '2px solid #ef4444' }} />
                      <span style={{ color: '#991b1b' }}>Absent ({selectedPerson.absentDays || 0} days)</span>
                    </div>
                    <div className="person-cal-legend-badge">
                      <span className="person-cal-legend-box" style={{ background: 'rgba(147, 51, 234, 0.18)', border: '2px solid #9333ea' }} />
                      <span style={{ color: '#7e22ce' }}>Holiday ({modalCalendarData.modalHolidaysCount || 0} in month)</span>
                    </div>
                    <div className="person-cal-legend-badge">
                      <span className="person-cal-legend-box" style={{ background: 'rgba(100, 116, 139, 0.15)', border: '1px dashed #94a3b8' }} />
                      <span style={{ color: '#64748b' }}>Weekend / Off</span>
                    </div>
                  </div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.825rem', fontWeight: 600 }}>
                    Working Days: <strong style={{ color: 'var(--color-primary)' }}>{selectedPerson.expectedWorkingDays || 0}</strong> • Attendance Rate: <strong style={{ color: 'var(--color-primary-light)' }}>{selectedPerson.attendanceRate || 0}%</strong>
                    {(selectedPerson.daysPresent || 0) + (selectedPerson.absentDays || 0) > (selectedPerson.expectedWorkingDays || 0) && (
                      <span style={{ marginLeft: '0.5rem', color: '#10b981', fontSize: '0.78rem' }}>
                        (attended on holidays/off days)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Comprehensive Attendance Sheet View */
              <div>
                {/* 1. Summary Strip with Clear Metrics */}
                <div className="sheet-summary-strip">
                  <span className="sheet-summary-pill" style={{ background: '#f1f5f9', color: '#334155' }}>
                    Total Period: <strong>{personSheetData.stats.totalDays} Days</strong>
                  </span>
                  <span className="sheet-summary-pill" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#1d4ed8' }}>
                    Working Days: <strong>{personSheetData.stats.workingDays} Days</strong>
                  </span>
                  <span className="sheet-summary-pill" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#047857' }}>
                    Present: <strong>{personSheetData.stats.totalPresent} Days</strong>
                  </span>
                  <span className="sheet-summary-pill" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#b91c1c' }}>
                    Absent: <strong>{personSheetData.stats.totalAbsent} Days</strong>
                  </span>
                  {personSheetData.stats.totalHolidays > 0 && (
                    <span className="sheet-summary-pill" style={{ background: 'rgba(147, 51, 234, 0.12)', color: '#6b21a8' }}>
                      Holidays: <strong>{personSheetData.stats.totalHolidays}</strong>
                    </span>
                  )}
                  <span className="sheet-summary-pill" style={{ background: 'rgba(100, 116, 139, 0.1)', color: '#475569' }}>
                    Weekends / Off: <strong>{personSheetData.stats.totalWeekends}</strong>
                  </span>
                  <span className="sheet-summary-pill" style={{ background: 'rgba(14, 165, 233, 0.12)', color: '#0369a1' }}>
                    Total Hours: <strong>{personSheetData.stats.totalHours} hrs</strong>
                  </span>
                  <span className="sheet-summary-pill" style={{ background: 'rgba(16, 185, 129, 0.18)', color: '#065f46', marginLeft: 'auto' }}>
                    Attendance Rate: <strong>{personSheetData.stats.attendanceRate}%</strong>
                  </span>
                </div>

                {/* 2. Interactive Quick Filter Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div className="sheet-filter-bar" style={{ margin: 0 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginRight: '0.25rem' }}>Filter Days:</span>
                    <button
                      type="button"
                      className={`sheet-filter-btn ${sheetFilter === 'ALL' ? 'active' : ''}`}
                      onClick={() => setSheetFilter('ALL')}
                    >
                      All Days ({personSheetData.rows.length})
                    </button>
                    <button
                      type="button"
                      className={`sheet-filter-btn ${sheetFilter === 'PRESENT' ? 'active' : ''}`}
                      onClick={() => setSheetFilter('PRESENT')}
                    >
                      Present Only ({personSheetData.stats.totalPresent})
                    </button>
                    <button
                      type="button"
                      className={`sheet-filter-btn ${sheetFilter === 'ABSENT' ? 'active' : ''}`}
                      onClick={() => setSheetFilter('ABSENT')}
                    >
                      Absent Only ({personSheetData.stats.totalAbsent})
                    </button>
                    {personSheetData.stats.totalHolidays > 0 && (
                      <button
                        type="button"
                        className={`sheet-filter-btn ${sheetFilter === 'HOLIDAY' ? 'active' : ''}`}
                        onClick={() => setSheetFilter('HOLIDAY')}
                      >
                        Holidays ({personSheetData.stats.totalHolidays})
                      </button>
                    )}
                    <button
                      type="button"
                      className={`sheet-filter-btn ${sheetFilter === 'WORKING_DAYS' ? 'active' : ''}`}
                      onClick={() => setSheetFilter('WORKING_DAYS')}
                    >
                      Working Days ({personSheetData.stats.workingDays})
                    </button>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                    Showing <strong>{filteredSheetRows.length}</strong> of <strong>{personSheetData.rows.length}</strong> records
                  </div>
                </div>

                {/* 3. Sheet Table with Proper Colors & Alignment */}
                {sessionsLoading ? (
                  <div style={{ padding: '2rem', textAlign: 'center' }}>Loading attendance sheet...</div>
                ) : (
                  <div className="sheet-table-container">
                    <table className="sheet-table">
                      <thead>
                        <tr>
                          <th style={{ width: '105px' }}>Date</th>
                          <th style={{ width: '95px' }}>Day</th>
                          <th style={{ width: '150px' }}>Status</th>
                          <th style={{ width: '95px' }}>Check In</th>
                          <th style={{ width: '95px' }}>Check Out</th>
                          <th style={{ width: '110px', textAlign: 'right' }}>Duration</th>
                          <th style={{ width: '80px' }}>Late</th>
                          <th style={{ width: '110px' }}>Session Status</th>
                          <th style={{ width: '65px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSheetRows.map(row => {
                          let rowClass = '';
                          if (row.statusType === 'PRESENT') rowClass = 'row-present';
                          else if (row.statusType === 'ABSENT') rowClass = 'row-absent';
                          else if (row.statusType === 'HOLIDAY') rowClass = 'row-holiday';
                          else if (row.statusType === 'WEEKEND') rowClass = 'row-weekend';

                          let badgeElement = null;
                          if (row.statusType === 'PRESENT') {
                            if (row.isHoliday) {
                              badgeElement = <span className="badge badge-present-holiday">{row.statusLabel}</span>;
                            } else if (!row.isWorkingDay) {
                              badgeElement = <span className="badge badge-present-holiday">{row.statusLabel}</span>;
                            } else {
                              badgeElement = <span className="badge badge-present-enclosed">PRESENT</span>;
                            }
                          } else if (row.statusType === 'ABSENT') {
                            badgeElement = <span className="badge badge-absent-enclosed">ABSENT</span>;
                          } else if (row.statusType === 'HOLIDAY') {
                            badgeElement = <span className="badge badge-holiday-enclosed" title={row.holidayName}>{row.holidayName || 'HOLIDAY'}</span>;
                          } else if (row.statusType === 'NOT_JOINED') {
                            badgeElement = <span className="badge badge-prejoin-enclosed">NOT JOINED</span>;
                          } else {
                            badgeElement = <span className="badge badge-weekend-enclosed">{row.shortDay} (OFF)</span>;
                          }

                          return (
                            <tr key={row.date} className={rowClass}>
                              <td className="text-center font-mono" style={{ fontWeight: 600 }}>{row.date}</td>
                              <td className="text-center">{row.day}</td>
                              <td className="text-center">{badgeElement}</td>
                              <td className="text-center font-mono">
                                {row.checkInAt ? formatTime(row.checkInAt) : '-'}
                              </td>
                              <td className="text-center font-mono">
                                {row.checkOutAt ? formatTime(row.checkOutAt) : '-'}
                              </td>
                              <td className="text-right font-mono" style={{ fontWeight: 600 }}>
                                {row.durationMinutes > 0 ? `${(row.durationMinutes / 60).toFixed(2)} hrs` : '-'}
                              </td>
                              <td className="text-center">
                                {row.isLate ? (
                                  <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '2px 5px' }}>LATE</span>
                                ) : (
                                  row.statusType === 'PRESENT' ? <span style={{ color: '#059669', fontSize: '0.75rem', fontWeight: 600 }}>✓</span> : '-'
                                )}
                              </td>
                              <td className="text-center">
                                {row.sessionStatus ? (
                                  <span className={`badge badge-${row.sessionStatus === 'CLOSED' ? 'success' : row.sessionStatus === 'AUTO_CLOSED' ? 'danger' : 'primary'}`} style={{ fontSize: '0.68rem' }}>
                                    {row.sessionStatus === 'AUTO_CLOSED' ? 'check-out' : row.sessionStatus === 'CLOSED' ? 'completed' : row.sessionStatus}
                                  </span>
                                ) : '-'}
                              </td>
                              <td className="text-center">
                                {row.session && (row.session.status === 'AUTO_CLOSED' || row.session.status === 'OPEN') && (
                                  <button
                                    className="icon-btn-small text-primary"
                                    title="Correct Session"
                                    onClick={() => {
                                      setCorrectionMode(row.session.sessionId);
                                      setCorrectionForm({
                                        checkOutAt: row.session.checkOutAt ? row.session.checkOutAt.substring(0, 16) : new Date().toISOString().substring(0, 16),
                                        correctionReason: ''
                                      });
                                    }}
                                  >
                                    <ZenvEditIcon size={15} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {filteredSheetRows.length === 0 && (
                          <tr>
                            <td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">
                              No records match the current filter.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {correctionMode && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--color-bg-subtle)', borderRadius: 'var(--border-radius)' }}>
                <h4>Correct Session (ID: {correctionMode})</h4>
                <form onSubmit={handleCorrectionSubmit} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginTop: '1rem' }}>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="form-label">Correct Check-Out Time</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={correctionForm.checkOutAt}
                      onChange={e => setCorrectionForm({ ...correctionForm, checkOutAt: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                    <label className="form-label">Reason for Correction</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Forgot to tap out, system error"
                      value={correctionForm.correctionReason}
                      onChange={e => setCorrectionForm({ ...correctionForm, correctionReason: e.target.value })}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">Apply</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setCorrectionMode(null)}>Cancel</button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {showAbsencesModal && selectedAbsencePerson && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '550px', width: '90%' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                Absence Breakdown: {selectedAbsencePerson.fullName} {selectedAbsencePerson.externalRef ? `(${selectedAbsencePerson.externalRef})` : ''}
              </h2>
              <button className="modal-close" onClick={() => setShowAbsencesModal(false)}><X size={20} /></button>
            </div>

            <div className="report-modal-alert">
              <strong>Total Missed Working Days: {selectedAbsencePerson.absentDays}</strong> (Period: {startDate} to {endDate})
            </div>

            <div className="data-table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Day</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedAbsencePerson.absentDates || []).map((dateStr, idx) => {
                    const d = new Date(dateStr + 'T00:00:00');
                    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
                    return (
                      <tr key={idx}>
                        <td className="text-muted">{idx + 1}</td>
                        <td className="font-medium">{dateStr}</td>
                        <td>{dayName}</td>
                        <td><span className="badge badge-danger">ABSENT</span></td>
                      </tr>
                    );
                  })}
                  {(!selectedAbsencePerson.absentDates || selectedAbsencePerson.absentDates.length === 0) && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center' }} className="text-muted">No absences recorded in this period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="modal-footer" style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button className="btn btn-secondary" onClick={() => setShowAbsencesModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

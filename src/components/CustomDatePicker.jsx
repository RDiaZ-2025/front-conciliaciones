import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { es } from 'date-fns/locale';
import { 
  TextField, 
  Box, 
  IconButton, 
  Paper,
  Typography,
  Button,
  Grid,
  Select,
  MenuItem,
  FormControl
} from '@mui/material';
import { 
  CalendarToday as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Today as TodayIcon
} from '@mui/icons-material';

const CustomDatePicker = ({ 
  label, 
  value, 
  onChange, 
  darkMode = false,
  disabled = false,
  placeholder = "Seleccionar fecha",
  ...props 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null);

  const handleDateChange = (date) => {
    setSelectedDate(date);
    const formattedDate = date ? date.toISOString().split('T')[0] : '';
    onChange(formattedDate);
    setIsOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    setSelectedDate(today);
    const formattedDate = today.toISOString().split('T')[0];
    onChange(formattedDate);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedDate(null);
    onChange('');
    setIsOpen(false);
  };

  const formatDisplayDate = (date) => {
    if (!date) return '';
    const options = { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    return new Date(date).toLocaleDateString('es-ES', options);
  };

  // Estado para controlar la vista de selección
  const [showYearMonthPicker, setShowYearMonthPicker] = useState(false);
  const [tempYear, setTempYear] = useState(selectedDate ? selectedDate.getFullYear() : new Date().getFullYear());
  const [tempMonth, setTempMonth] = useState(selectedDate ? selectedDate.getMonth() : new Date().getMonth());

  // Sincronizar estados cuando cambie la fecha seleccionada
  useEffect(() => {
    if (selectedDate) {
      setTempYear(selectedDate.getFullYear());
      setTempMonth(selectedDate.getMonth());
    }
  }, [selectedDate]);

  // Funciones para navegación del calendario
  const handlePreviousMonth = () => {
    const currentDate = selectedDate || new Date();
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    setSelectedDate(newDate);
    setTempYear(newDate.getFullYear());
    setTempMonth(newDate.getMonth());
  };

  const handleNextMonth = () => {
    const currentDate = selectedDate || new Date();
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setSelectedDate(newDate);
    setTempYear(newDate.getFullYear());
    setTempMonth(newDate.getMonth());
  };

  // Componente personalizado para el header del calendario
  const CustomHeader = () => {
    const currentDate = selectedDate || new Date();
    
    return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      p: 1,
      background: darkMode 
        ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
        : 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
      color: '#fff',
      borderRadius: '12px 12px 0 0'
    }}>
      <IconButton 
        onClick={handlePreviousMonth}
        sx={{ 
          color: '#fff',
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
        }}
      >
        <ChevronLeft />
      </IconButton>
      
      <Button
        onClick={() => setShowYearMonthPicker(!showYearMonthPicker)}
        sx={{ 
          color: '#fff',
          fontWeight: 600,
          fontSize: '1rem',
          textTransform: 'capitalize',
          '&:hover': { 
            backgroundColor: 'rgba(255,255,255,0.2)',
            transform: 'scale(1.02)'
          },
          borderRadius: 2,
          px: 2,
          py: 0.5,
          border: '1px solid rgba(255,255,255,0.3)',
          transition: 'all 0.2s ease',
          minWidth: '180px'
        }}
        endIcon={
          <Box sx={{ 
            fontSize: '0.8rem', 
            opacity: 0.8,
            ml: 0.5
          }}>
            ▼
          </Box>
        }
      >
        {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
      </Button>
      
      <IconButton 
        onClick={handleNextMonth}
        sx={{ 
          color: '#fff',
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
        }}
      >
        <ChevronRight />
      </IconButton>
    </Box>
    );
  };

  // Componente personalizado para cada día
  const CustomDay = ({ day, date, selected, ...dayProps }) => {
    const isToday = new Date().toDateString() === date.toDateString();
    const isSelected = selected;
    
    return (
      <Box
        {...dayProps}
        sx={{
          width: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '12px',
          cursor: 'pointer',
          fontSize: '0.95rem',
          fontWeight: isSelected || isToday ? 700 : 500,
          color: isSelected 
            ? '#fff' 
            : isToday 
              ? (darkMode ? '#81c784' : '#059669')
              : (darkMode ? '#e2e8f0' : '#374151'),
          backgroundColor: isSelected 
            ? (darkMode ? '#81c784' : '#059669')
            : isToday 
              ? (darkMode ? 'rgba(129, 199, 132, 0.2)' : 'rgba(5, 150, 105, 0.1)')
              : 'transparent',
          border: isToday && !isSelected 
            ? `2px solid ${darkMode ? '#81c784' : '#059669'}`
            : 'none',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: isSelected 
              ? (darkMode ? '#66bb6a' : '#047857')
              : (darkMode ? 'rgba(129, 199, 132, 0.4)' : 'rgba(5, 150, 105, 0.3)'),
            transform: 'scale(1.05)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }
        }}
      >
        {day}
      </Box>
    );
  };

  // Componente para selección rápida de año y mes
  const YearMonthPicker = () => {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const handleApplyYearMonth = () => {
      const newDate = new Date(tempYear, tempMonth, 1);
      setSelectedDate(newDate);
      setShowYearMonthPicker(false);
    };

    return (
      <Box sx={{ 
        p: 3, 
        background: darkMode 
          ? 'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)'
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff'
      }}>
        <Typography variant="h6" sx={{ 
          textAlign: 'center', 
          mb: 2, 
          fontWeight: 600,
          color: '#fff'
        }}>
          Seleccionar Año y Mes
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" sx={{ mb: 1, color: '#fff', opacity: 0.9 }}>
              Mes
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                value={tempMonth}
                onChange={(e) => setTempMonth(e.target.value)}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#fff',
                  },
                  '& .MuiSvgIcon-root': {
                    color: '#fff',
                  }
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      backgroundColor: darkMode ? '#2d3748' : '#fff',
                      maxHeight: 200
                    }
                  }
                }}
              >
                {months.map((month, index) => (
                  <MenuItem 
                    key={index} 
                    value={index}
                    sx={{
                      color: darkMode ? '#fff' : '#000',
                      '&:hover': {
                        backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                      }
                    }}
                  >
                    {month}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" sx={{ mb: 1, color: '#fff', opacity: 0.9 }}>
              Año
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                value={tempYear}
                onChange={(e) => setTempYear(e.target.value)}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#fff',
                  },
                  '& .MuiSvgIcon-root': {
                    color: '#fff',
                  }
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      backgroundColor: darkMode ? '#2d3748' : '#fff',
                      maxHeight: 200
                    }
                  }
                }}
              >
                {years.map((year) => (
                  <MenuItem 
                    key={year} 
                    value={year}
                    sx={{
                      color: darkMode ? '#fff' : '#000',
                      '&:hover': {
                        backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                      }
                    }}
                  >
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ 
              display: 'flex', 
              gap: 2, 
              justifyContent: 'center',
              mt: 2
            }}>
              <Button
                variant="outlined"
                onClick={() => setShowYearMonthPicker(false)}
                sx={{
                  color: '#fff',
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  '&:hover': {
                    borderColor: '#fff',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={handleApplyYearMonth}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.3)'
                  }
                }}
              >
                Aplicar
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    );
  };

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <TextField
        fullWidth
        label={label}
        value={formatDisplayDate(value)}
        placeholder={placeholder}
        disabled={Boolean(disabled)}
        onClick={() => !disabled && setIsOpen(true)}
        InputProps={{
          readOnly: true,
          endAdornment: (
            <IconButton 
              onClick={() => !disabled && setIsOpen(true)}
              disabled={Boolean(disabled)}
              sx={{ 
                color: darkMode ? '#E6EDF3' : '#6b7280',
                '&:hover': {
                  backgroundColor: darkMode ? 'rgba(230, 237, 243, 0.1)' : 'rgba(107, 114, 128, 0.1)'
                }
              }}
            >
              <CalendarIcon />
            </IconButton>
          )
        }}
        sx={{
          cursor: disabled ? 'default' : 'pointer',
          '& .MuiOutlinedInput-root': {
            backgroundColor: darkMode ? '#4A5568' : '#f8fafc',
            color: darkMode ? '#E6EDF3' : '#1a202c',
            minHeight: '56px',
            cursor: disabled ? 'default' : 'pointer',
            border: darkMode ? '1.5px solid #4A5568' : 'none',
            '& fieldset': {
              borderColor: darkMode ? '#4A5568' : '#e2e8f0',
            },
            '&:hover fieldset': {
              borderColor: disabled ? (darkMode ? '#4A5568' : '#e2e8f0') : (darkMode ? '#E60026' : '#6b7280'),
            },
            '&.Mui-focused fieldset': {
              borderColor: darkMode ? '#E60026' : '#6b7280',
            },
          },
          '& .MuiInputLabel-root': {
            color: darkMode ? '#E6EDF3' : '#64748b',
            fontSize: '0.95rem',
            fontWeight: 500,
          },
          '& .MuiInputBase-input': {
            cursor: disabled ? 'default' : 'pointer',
          }
        }}
        {...Object.fromEntries(
          Object.entries(props).filter(([key]) => 
            !['disabled', 'readOnly', 'checked', 'selected', 'autoFocus'].includes(key)
          )
        )}
      />

      {isOpen && (
        <>
          {/* Overlay para cerrar al hacer clic fuera */}
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9998,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(2px)'
            }}
            onClick={() => setIsOpen(false)}
          />
          
          <Paper
            sx={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 9999,
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: darkMode 
                ? '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 10px 20px -5px rgba(0, 0, 0, 0.3)'
                : '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 10px 20px -5px rgba(0, 0, 0, 0.1)',
              background: darkMode ? '#4A5568' : '#fff',
              border: `1px solid ${darkMode ? '#4A5568' : '#e2e8f0'}`,
              width: '350px',
              maxHeight: '500px'
            }}
          >
            {showYearMonthPicker ? (
              <YearMonthPicker />
            ) : (
              <>
                <CustomHeader />
                <DatePicker
                  selected={selectedDate}
                  onChange={handleDateChange}
                  inline
                  locale={es}
                  calendarClassName="custom-calendar"
                  renderCustomHeader={() => null}
                />
                <Box sx={{ 
                  p: 1, 
                  borderTop: `1px solid ${darkMode ? '#4A5568' : '#e2e8f0'}`,
                  display: 'flex',
                  gap: 1,
                  justifyContent: 'center'
                }}>
                  <Button
                    size="small"
                    onClick={handleToday}
                    sx={{
                      color: darkMode ? '#E6EDF3' : '#64748b',
                      '&:hover': {
                        backgroundColor: darkMode ? 'rgba(230, 237, 243, 0.1)' : 'rgba(100, 116, 139, 0.1)'
                      }
                    }}
                  >
                    Hoy
                  </Button>
                  <Button
                    size="small"
                    onClick={handleClear}
                    sx={{
                      color: darkMode ? '#E6EDF3' : '#64748b',
                      '&:hover': {
                        backgroundColor: darkMode ? 'rgba(230, 237, 243, 0.1)' : 'rgba(100, 116, 139, 0.1)'
                      }
                    }}
                  >
                    Limpiar
                  </Button>
                </Box>
              </>
            )}
          </Paper>
        </>
      )}

      <style jsx global>{`
        .react-datepicker {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
        
        .react-datepicker__header {
          display: none !important;
        }
        
        .react-datepicker__current-month {
          display: none !important;
        }
        
        .react-datepicker__navigation {
          display: none !important;
        }
        
        .react-datepicker__navigation--previous {
          display: none !important;
        }
        
        .react-datepicker__navigation--next {
          display: none !important;
        }
        
        .react-datepicker__month-container {
          background: ${darkMode ? '#4A5568' : '#fff'} !important;
        }
        
        .react-datepicker__month {
          margin: 0 !important;
          padding: 16px !important;
        }
        
        .react-datepicker__week {
          display: flex !important;
          justify-content: space-around !important;
          margin-bottom: 6px !important;
          gap: 4px !important;
        }
        
        .react-datepicker__day-names {
          display: flex !important;
          justify-content: space-around !important;
          margin-bottom: 12px !important;
          padding: 0 16px !important;
          gap: 4px !important;
        }
        
        .react-datepicker__day-name {
          color: ${darkMode ? '#f1f5f9' : '#475569'} !important;
          font-weight: 700 !important;
          font-size: 0.85rem !important;
          width: 40px !important;
          text-align: center !important;
          margin-bottom: 8px !important;
        }
        
        .react-datepicker__day {
          margin: 2px !important;
          border-radius: 12px !important;
          width: 40px !important;
          height: 40px !important;
          line-height: 40px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          color: ${darkMode ? '#f1f5f9' : '#1e293b'} !important;
          transition: all 0.2s ease !important;
          font-size: 0.95rem !important;
          font-weight: 600 !important;
        }
        
        .react-datepicker__day:hover {
          background: ${darkMode ? 'rgba(99, 102, 241, 0.2)' : 'rgba(59, 130, 246, 0.15)'} !important;
          transform: scale(1.05) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          color: ${darkMode ? '#e2e8f0' : '#1e293b'} !important;
        }
        
        .react-datepicker__day--selected {
          background: ${darkMode ? '#4f46e5' : '#3b82f6'} !important;
          color: #fff !important;
          font-weight: 700 !important;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3) !important;
        }
        
        .react-datepicker__day--selected:hover {
          background: ${darkMode ? '#6366f1' : '#2563eb'} !important;
        }
        
        .react-datepicker__day--today {
          background: ${darkMode ? 'rgba(99, 102, 241, 0.15)' : 'rgba(59, 130, 246, 0.1)'} !important;
          color: ${darkMode ? '#6366f1' : '#3b82f6'} !important;
          font-weight: 700 !important;
          border: ${darkMode ? '2px solid #6366f1' : '2px solid #3b82f6'} !important;
        }
        
        .react-datepicker__day--outside-month {
            color: ${darkMode ? '#718096' : '#d1d5db'} !important;
          }
          
          .react-datepicker__day--disabled {
            color: ${darkMode ? '#718096' : '#d1d5db'} !important;
            cursor: not-allowed !important;
          }
      `}</style>
    </Box>
  );
};

export default CustomDatePicker;
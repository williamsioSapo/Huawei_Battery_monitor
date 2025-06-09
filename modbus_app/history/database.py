# modbus_app/history/database.py
"""
Módulo para gestión de base de datos SQLite del historial de baterías.
Maneja la creación, conexión y operaciones CRUD de la base de datos.
"""

import sqlite3
import json
import os
import threading
from datetime import datetime
from contextlib import contextmanager
from typing import Dict, List, Optional, Any
import logging

# Configurar logger
logger = logging.getLogger('history.database')

class BatteryHistoryDB:
    """
    Gestor de base de datos SQLite para historial de baterías.
    Thread-safe y optimizado para operaciones de historial.
    """
    
    def __init__(self, db_path: str = "battery_history.db"):
        """
        Inicializa el gestor de base de datos.
        
        Args:
            db_path (str): Ruta al archivo de base de datos SQLite
        """
        self.db_path = db_path
        self.lock = threading.RLock()
        self._ensure_database_exists()
        
    def _ensure_database_exists(self):
        """Crea la base de datos y tablas si no existen."""
        try:
            with self.get_connection() as conn:
                self._create_tables(conn)
                logger.info(f"Base de datos inicializada: {self.db_path}")
        except Exception as e:
            logger.error(f"Error al inicializar base de datos: {str(e)}")
            raise
    
    @contextmanager
    def get_connection(self):
        """
        Context manager para obtener conexión a la base de datos.
        Garantiza que la conexión se cierre automáticamente.
        """
        conn = None
        try:
            conn = sqlite3.connect(self.db_path, timeout=30.0)
            conn.row_factory = sqlite3.Row  # Para acceso por nombre de columna
            # Configuraciones de optimización
            conn.execute("PRAGMA journal_mode = WAL")
            conn.execute("PRAGMA synchronous = NORMAL")
            conn.execute("PRAGMA cache_size = 10000")
            conn.execute("PRAGMA foreign_keys = ON")
            yield conn
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Error en conexión a base de datos: {str(e)}")
            raise
        finally:
            if conn:
                conn.close()
    
    def _create_tables(self, conn: sqlite3.Connection):
        """Crea todas las tablas necesarias."""
        
        # Tabla principal de histórico
        conn.execute("""
            CREATE TABLE IF NOT EXISTS battery_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                battery_id INTEGER NOT NULL,
                timestamp DATETIME NOT NULL,
                source TEXT NOT NULL,  -- 'initial_sync' o 'live_monitor'
                
                -- Datos básicos de batería
                pack_voltage REAL,
                battery_current REAL,
                soc INTEGER,
                soh INTEGER,
                temp_min INTEGER,
                temp_max INTEGER,
                
                -- Contadores acumulados
                discharge_ah_accumulated INTEGER,
                discharge_times_total INTEGER,
                charge_cycles_accumulated INTEGER,
                
                -- Estados y diagnósticos
                hardware_faults INTEGER,        -- Registro 0x0046
                sensor_status INTEGER,          -- Registro 0x0048  
                operation_mode INTEGER,         -- Registro 0x0049
                subsystem_status INTEGER,       -- Registro 0x004A
                
                -- Información de celdas (summary)
                cell_count INTEGER,             -- Número total de celdas
                cell_voltage_min REAL,          -- Voltaje mínimo entre celdas
                cell_voltage_max REAL,          -- Voltaje máximo entre celdas
                cell_voltage_avg REAL,          -- Voltaje promedio de celdas
                cell_temp_min INTEGER,          -- Temperatura mínima entre celdas
                cell_temp_max INTEGER,          -- Temperatura máximo entre celdas
                cell_temp_avg REAL,             -- Temperatura promedio de celdas
                
                -- Metadatos
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE(battery_id, timestamp)
            )
        """)
        
        # Tabla específica para voltajes de celdas individuales
        conn.execute("""
            CREATE TABLE IF NOT EXISTS cell_voltages_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                battery_history_id INTEGER NOT NULL,
                cell_number INTEGER NOT NULL,
                voltage REAL,
                status TEXT DEFAULT 'OK',  -- 'OK', 'DISCONNECTED', 'ERROR'
                raw_value INTEGER,         -- Valor crudo del registro
                
                FOREIGN KEY (battery_history_id) REFERENCES battery_history(id) ON DELETE CASCADE
            )
        """)
        
        # Tabla específica para temperaturas de celdas individuales  
        conn.execute("""
            CREATE TABLE IF NOT EXISTS cell_temperatures_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                battery_history_id INTEGER NOT NULL,
                cell_number INTEGER NOT NULL,
                temperature INTEGER,
                status TEXT DEFAULT 'OK',  -- 'OK', 'DISCONNECTED', 'OUT_OF_RANGE'
                raw_value INTEGER,         -- Valor crudo del registro
                
                FOREIGN KEY (battery_history_id) REFERENCES battery_history(id) ON DELETE CASCADE
            )
        """)
        
        # Tabla para control de sincronización
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sync_status (
                battery_id INTEGER PRIMARY KEY,
                manufacturer TEXT,
                model TEXT,
                serial_number TEXT,
                cell_count INTEGER,
                
                -- Control de sincronización inicial
                initial_sync_completed BOOLEAN DEFAULT FALSE,
                initial_sync_date DATETIME,
                total_records_imported INTEGER DEFAULT 0,
                last_record_number INTEGER,
                
                -- Control de monitoreo continuo
                continuous_monitoring BOOLEAN DEFAULT FALSE,
                monitoring_start_date DATETIME,
                last_monitor_reading DATETIME,
                total_monitor_records INTEGER DEFAULT 0,
                
                -- Metadatos
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Tabla para metadatos de exportación
        conn.execute("""
            CREATE TABLE IF NOT EXISTS export_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                battery_id INTEGER,
                export_type TEXT,           -- 'full', 'range', 'filtered'
                start_date DATETIME,
                end_date DATETIME,
                records_exported INTEGER,
                file_format TEXT,           -- 'json', 'csv'
                file_path TEXT,
                export_duration_seconds REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Crear índices para optimización
        self._create_indexes(conn)
        
        # Confirmar cambios
        conn.commit()
        logger.info("Tablas creadas exitosamente")
    
    def _create_indexes(self, conn: sqlite3.Connection):
        """Crea índices para optimizar consultas."""
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_battery_timestamp ON battery_history(battery_id, timestamp)",
            "CREATE INDEX IF NOT EXISTS idx_battery_source ON battery_history(battery_id, source)",
            "CREATE INDEX IF NOT EXISTS idx_timestamp_range ON battery_history(timestamp)",
            "CREATE INDEX IF NOT EXISTS idx_cell_voltages_history ON cell_voltages_history(battery_history_id, cell_number)",
            "CREATE INDEX IF NOT EXISTS idx_cell_temperatures_history ON cell_temperatures_history(battery_history_id, cell_number)",
            "CREATE INDEX IF NOT EXISTS idx_sync_battery ON sync_status(battery_id)"
        ]
        
        for index_sql in indexes:
            try:
                conn.execute(index_sql)
            except Exception as e:
                logger.warning(f"Error creando índice: {str(e)}")

    def auto_add_column(self, column_name, column_type="INTEGER"):
        """
        Agrega automáticamente una columna a la tabla battery_history.
        
        Args:
            column_name: Nombre de la columna
            column_type: Tipo SQL (INTEGER, REAL, TEXT)
        """
        try:
            with self.get_connection() as conn:
                sql = f"ALTER TABLE battery_history ADD COLUMN {column_name} {column_type}"
                conn.execute(sql)
                conn.commit()
                print(f"AUTO-EXPAND: Columna '{column_name}' ({column_type}) agregada exitosamente")
                return True
        except Exception as e:
            error_msg = str(e).lower()
            if "duplicate column name" in error_msg:
                print(f"AUTO-EXPAND: Columna '{column_name}' ya existe")
                return True  # No es error, ya existía
            else:
                print(f"AUTO-EXPAND: Error agregando columna '{column_name}': {str(e)}")
                return False
    
    def _extract_missing_column(self, error_message):
        """
        Extrae el nombre de la columna faltante del mensaje de error SQLite.
        """
        try:
            # SQLite error: "no such column: hardware_faults"
            if "no such column:" in error_message:
                return error_message.split("no such column:")[1].strip()
            # Otros formatos posibles
            elif "unknown column" in error_message:
                return error_message.split("unknown column")[1].strip().strip("'\"")
            return None
        except:
            return None

    def _detect_column_type(self, value):
        """
        Detecta automáticamente el tipo de columna SQL basado en el valor.
        """
        if value is None:
            return "INTEGER"  # Tipo por defecto
        elif isinstance(value, bool):
            return "INTEGER"  # SQLite guarda bool como INTEGER
        elif isinstance(value, int):
            return "INTEGER"
        elif isinstance(value, float):
            return "REAL"
        elif isinstance(value, str):
            return "TEXT"
        else:
            return "TEXT"  # Tipo por defecto para casos desconocidos
        
    def _insert_normal(self, conn, battery_id, timestamp, source, basic_data, cell_voltages=None, cell_temperatures=None):
        """
        Inserción normal sin auto-expand (lógica original).
        """
        # Calcular estadísticas de celdas
        cell_stats = self._calculate_cell_stats(cell_voltages, cell_temperatures)
        
        # Preparar datos base
        base_values = {
            'battery_id': battery_id,
            'timestamp': timestamp, 
            'source': source,
            'pack_voltage': basic_data.get('pack_voltage'),
            'battery_current': basic_data.get('battery_current'),
            'soc': basic_data.get('soc'),
            'soh': basic_data.get('soh'),
            'temp_min': basic_data.get('temp_min'),
            'temp_max': basic_data.get('temp_max'),
            'cell_count': cell_stats['cell_count'],
            'cell_voltage_min': cell_stats['voltage_min'],
            'cell_voltage_max': cell_stats['voltage_max'],
            'cell_voltage_avg': cell_stats['voltage_avg'],
            'cell_temp_min': cell_stats['temp_min'],
            'cell_temp_max': cell_stats['temp_max'],
            'cell_temp_avg': cell_stats['temp_avg']
        }
        
        # AGREGAR CAMPOS EXPANDIDOS
        for key, value in basic_data.items():
            if key not in base_values:  # Solo campos nuevos
                base_values[key] = value
        
        # Construir SQL dinámico
        columns = ', '.join(base_values.keys())
        placeholders = ', '.join(['?' for _ in base_values])
        values = list(base_values.values())
        
        sql = f"INSERT INTO battery_history ({columns}) VALUES ({placeholders})"
        cursor = conn.execute(sql, values)
        history_id = cursor.lastrowid
        
        # Insertar datos de celdas (sin cambios)
        if history_id and cell_voltages:
            self._insert_cell_voltages(conn, history_id, cell_voltages)
        if history_id and cell_temperatures:
            self._insert_cell_temperatures(conn, history_id, cell_temperatures)
        
        conn.commit()
        return history_id    
    # ==================== OPERACIONES DE SYNC_STATUS ====================
    
    def get_sync_status(self, battery_id: int) -> Optional[Dict]:
        """Obtiene el estado de sincronización de una batería."""
        with self.get_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM sync_status WHERE battery_id = ?",
                (battery_id,)
            )
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def create_or_update_sync_status(self, battery_id: int, **kwargs) -> bool:
        """Crea o actualiza el estado de sincronización."""
        try:
            with self.get_connection() as conn:
                # Verificar si existe
                existing = self.get_sync_status(battery_id)
                
                if existing:
                    # Actualizar registro existente
                    set_clauses = []
                    values = []
                    
                    for key, value in kwargs.items():
                        if key in ['manufacturer', 'model', 'serial_number', 'cell_count',
                                 'initial_sync_completed', 'initial_sync_date', 'total_records_imported',
                                 'last_record_number', 'continuous_monitoring', 'monitoring_start_date',
                                 'last_monitor_reading', 'total_monitor_records']:
                            set_clauses.append(f"{key} = ?")
                            values.append(value)
                    
                    if set_clauses:
                        set_clauses.append("updated_at = CURRENT_TIMESTAMP")
                        values.append(battery_id)
                        
                        sql = f"UPDATE sync_status SET {', '.join(set_clauses)} WHERE battery_id = ?"
                        conn.execute(sql, values)
                else:
                    # Crear nuevo registro
                    columns = ['battery_id'] + list(kwargs.keys())
                    placeholders = ', '.join(['?'] * len(columns))
                    values = [battery_id] + list(kwargs.values())
                    
                    sql = f"INSERT INTO sync_status ({', '.join(columns)}) VALUES ({placeholders})"
                    conn.execute(sql, values)
                
                conn.commit()
                return True
                
        except Exception as e:
            logger.error(f"Error actualizando sync_status para batería {battery_id}: {str(e)}")
            return False
    
    # ==================== OPERACIONES DE BATTERY_HISTORY ====================
    
    def insert_history_record(self, battery_id: int, timestamp: datetime, source: str, basic_data: Dict, cell_voltages: List[Dict] = None, cell_temperatures: List[Dict] = None) -> Optional[int]:
        """
        Inserta un registro completo de historial CON AUTO-EXPAND.
        """
        try:
            with self.get_connection() as conn:
                # Intentar insertar normalmente primero
                try:
                    return self._insert_normal(conn, battery_id, timestamp, source, basic_data, 
                                            cell_voltages, cell_temperatures)
                except Exception as e:
                    error_msg = str(e).lower()
                    if "no such column" in error_msg or "unknown column" in error_msg:
                        # Extraer nombre de columna faltante
                        missing_column = self._extract_missing_column(str(e))
                        if missing_column and missing_column in basic_data:
                            print(f"AUTO-EXPAND: Detectada columna faltante: {missing_column}")
                            
                            # Agregar columna automáticamente
                            column_type = self._detect_column_type(basic_data[missing_column])
                            if self.auto_add_column(missing_column, column_type):
                                # Reintentar inserción
                                return self._insert_normal(conn, battery_id, timestamp, source, basic_data,
                                                        cell_voltages, cell_temperatures)
                    raise e  # Re-lanzar si no se pudo resolver
                    
        except Exception as e:
            logger.error(f"Error insertando registro de historial: {str(e)}")
            return None

    
    def _calculate_cell_stats(self, cell_voltages: List[Dict], cell_temperatures: List[Dict]) -> Dict:
        """Calcula estadísticas resumidas de las celdas."""
        stats = {
            'cell_count': 0,
            'voltage_min': None, 'voltage_max': None, 'voltage_avg': None,
            'temp_min': None, 'temp_max': None, 'temp_avg': None
        }
        
        # Estadísticas de voltajes
        if cell_voltages:
            valid_voltages = [cell['voltage'] for cell in cell_voltages 
                            if cell.get('voltage') is not None and cell.get('status') == 'OK']
            if valid_voltages:
                stats['voltage_min'] = min(valid_voltages)
                stats['voltage_max'] = max(valid_voltages)
                stats['voltage_avg'] = round(sum(valid_voltages) / len(valid_voltages), 3)
                stats['cell_count'] = len(cell_voltages)
        
        # Estadísticas de temperaturas
        if cell_temperatures:
            valid_temps = [cell['temperature'] for cell in cell_temperatures 
                         if cell.get('temperature') is not None and cell.get('status') == 'OK']
            if valid_temps:
                stats['temp_min'] = min(valid_temps)
                stats['temp_max'] = max(valid_temps)
                stats['temp_avg'] = round(sum(valid_temps) / len(valid_temps), 1)
                if not stats['cell_count']:  # Si no se calculó por voltajes
                    stats['cell_count'] = len(cell_temperatures)
        
        return stats
    
    def _insert_cell_voltages(self, conn: sqlite3.Connection, history_id: int, cell_voltages: List[Dict]):
        """Inserta voltajes de celdas individuales."""
        sql = """
            INSERT INTO cell_voltages_history 
            (battery_history_id, cell_number, voltage, status, raw_value)
            VALUES (?, ?, ?, ?, ?)
        """
        
        values = [
            (history_id, cell['cell_number'], cell.get('voltage'), 
             cell.get('status', 'OK'), cell.get('raw_value'))
            for cell in cell_voltages
        ]
        
        conn.executemany(sql, values)
    
    def _insert_cell_temperatures(self, conn: sqlite3.Connection, history_id: int, cell_temperatures: List[Dict]):
        """Inserta temperaturas de celdas individuales."""
        sql = """
            INSERT INTO cell_temperatures_history 
            (battery_history_id, cell_number, temperature, status, raw_value)
            VALUES (?, ?, ?, ?, ?)
        """
        
        values = [
            (history_id, cell['cell_number'], cell.get('temperature'), 
             cell.get('status', 'OK'), cell.get('raw_value'))
            for cell in cell_temperatures
        ]
        
        conn.executemany(sql, values)
    
    # ==================== CONSULTAS DE HISTORIAL ====================
    
    def get_history_range(self, battery_id: int, start_date: datetime = None, 
                         end_date: datetime = None, limit: int = 1000) -> List[Dict]:
        """
        Obtiene registros de historial en un rango de fechas.
        
        Args:
            battery_id: ID de la batería
            start_date: Fecha de inicio (opcional)
            end_date: Fecha de fin (opcional)
            limit: Número máximo de registros
            
        Returns:
            Lista de registros de historial
        """
        try:
            with self.get_connection() as conn:
                sql = "SELECT * FROM battery_history WHERE battery_id = ?"
                params = [battery_id]
                
                if start_date:
                    sql += " AND timestamp >= ?"
                    params.append(start_date)
                
                if end_date:
                    sql += " AND timestamp <= ?"
                    params.append(end_date)
                
                sql += " ORDER BY timestamp DESC LIMIT ?"
                params.append(limit)
                
                cursor = conn.execute(sql, params)
                return [dict(row) for row in cursor.fetchall()]
                
        except Exception as e:
            logger.error(f"Error consultando historial: {str(e)}")
            return []
    
    def get_cell_data_for_history(self, history_id: int) -> Dict:
        """Obtiene datos detallados de celdas para un registro específico."""
        try:
            with self.get_connection() as conn:
                # Obtener voltajes
                voltage_cursor = conn.execute(
                    "SELECT * FROM cell_voltages_history WHERE battery_history_id = ? ORDER BY cell_number",
                    (history_id,)
                )
                voltages = [dict(row) for row in voltage_cursor.fetchall()]
                
                # Obtener temperaturas
                temp_cursor = conn.execute(
                    "SELECT * FROM cell_temperatures_history WHERE battery_history_id = ? ORDER BY cell_number",
                    (history_id,)
                )
                temperatures = [dict(row) for row in temp_cursor.fetchall()]
                
                return {
                    'voltages': voltages,
                    'temperatures': temperatures
                }
                
        except Exception as e:
            logger.error(f"Error obteniendo datos de celdas: {str(e)}")
            return {'voltages': [], 'temperatures': []}
    
    # ==================== UTILIDADES ====================
    
    def get_database_stats(self) -> Dict:
        """Obtiene estadísticas de la base de datos."""
        try:
            with self.get_connection() as conn:
                stats = {}
                
                # Estadísticas por tabla
                tables = ['battery_history', 'cell_voltages_history', 'cell_temperatures_history', 'sync_status']
                
                for table in tables:
                    cursor = conn.execute(f"SELECT COUNT(*) FROM {table}")
                    stats[f"{table}_count"] = cursor.fetchone()[0]
                
                # Estadísticas por batería
                cursor = conn.execute("""
                    SELECT battery_id, COUNT(*) as record_count, 
                           MIN(timestamp) as first_record, 
                           MAX(timestamp) as last_record
                    FROM battery_history 
                    GROUP BY battery_id
                """)
                
                stats['batteries'] = [dict(row) for row in cursor.fetchall()]
                
                # Tamaño del archivo
                if os.path.exists(self.db_path):
                    stats['file_size_mb'] = round(os.path.getsize(self.db_path) / (1024 * 1024), 2)
                
                return stats
                
        except Exception as e:
            logger.error(f"Error obteniendo estadísticas: {str(e)}")
            return {}
    
    def cleanup_old_records(self, battery_id: int, keep_days: int = 365) -> int:
        """
        Limpia registros antiguos para mantener el tamaño de la DB.
        
        Args:
            battery_id: ID de la batería
            keep_days: Días de historial a mantener
            
        Returns:
            Número de registros eliminados
        """
        try:
            with self.get_connection() as conn:
                cutoff_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
                cutoff_date = cutoff_date.replace(day=cutoff_date.day - keep_days)
                
                cursor = conn.execute(
                    "DELETE FROM battery_history WHERE battery_id = ? AND timestamp < ?",
                    (battery_id, cutoff_date)
                )
                
                deleted_count = cursor.rowcount
                conn.commit()
                
                logger.info(f"Eliminados {deleted_count} registros antiguos de batería {battery_id}")
                return deleted_count
                
        except Exception as e:
            logger.error(f"Error limpiando registros antiguos: {str(e)}")
            return 0


# Instancia global del gestor de base de datos
_db_instance = None

def get_db() -> BatteryHistoryDB:
    """Obtiene la instancia global de la base de datos."""
    global _db_instance
    if _db_instance is None:
        _db_instance = BatteryHistoryDB()
    return _db_instance

def initialize_database(db_path: str = "battery_history.db") -> BatteryHistoryDB:
    """Inicializa la base de datos con una ruta específica."""
    global _db_instance
    _db_instance = BatteryHistoryDB(db_path)
    return _db_instance
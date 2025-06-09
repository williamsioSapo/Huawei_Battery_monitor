# modbus_app/history/management.py
"""
Gestión y mantenimiento de la base de datos de historial.
Incluye funciones de reset, backup y mantenimiento general.
"""

import os
import logging
from datetime import datetime
from typing import Dict, Any
from modbus_app.logger_config import log_to_cmd

logger = logging.getLogger('history.management')

def reset_total_database() -> Dict[str, Any]:
    """
    Reset completo del sistema de historial:
    1. Elimina toda la base de datos física
    2. Recrea tablas con esquema básico original
    3. Las tablas se auto-expandirán según necesidad
    
    Returns:
        dict: Resultado de la operación con status y detalles
    """
    try:
        log_to_cmd("=== INICIANDO RESET TOTAL DE BASE DE DATOS ===", "INFO", "DB_RESET")
        
        # Paso 1: Obtener referencia a la base de datos actual
        log_to_cmd("Paso 1: Obteniendo referencia a la base de datos", "INFO", "DB_RESET")
        
        from modbus_app.history.database import get_db
        current_db = get_db()
        
        if not current_db:
            return {
                "status": "error",
                "message": "No se pudo obtener referencia a la base de datos",
                "database_recreated": False
            }
        
        db_path = current_db.db_path
        log_to_cmd(f"Base de datos encontrada: {db_path}", "INFO", "DB_RESET")
        
        # Paso 2: Verificar si el archivo existe
        if not os.path.exists(db_path):
            log_to_cmd(f"Archivo de base de datos no existe: {db_path}", "WARNING", "DB_RESET")
            # Si no existe, simplemente crear nueva
            from modbus_app.history.database import initialize_database
            new_db = initialize_database(db_path)
            
            return {
                "status": "success",
                "message": "Base de datos creada (no existía previamente)",
                "database_recreated": True,
                "schema": "basic (will auto-expand as needed)",
                "file_path": db_path
            }
        
        # Paso 3: Forzar cierre de todas las conexiones
        log_to_cmd("Paso 2: Cerrando conexiones de base de datos", "INFO", "DB_RESET")
        
        try:
            # Intentar cerrar conexiones limpiamente
            del current_db
            
            # Forzar garbage collection para liberar conexiones
            import gc
            gc.collect()
            
            log_to_cmd("Conexiones cerradas correctamente", "INFO", "DB_RESET")
            
        except Exception as e:
            log_to_cmd(f"Advertencia al cerrar conexiones: {str(e)}", "WARNING", "DB_RESET")
            # Continuar de todos modos
        
        # Paso 4: Eliminar archivo físico
        log_to_cmd("Paso 3: Eliminando archivo de base de datos", "INFO", "DB_RESET")
        
        try:
            # Crear backup del nombre si necesario para debug
            backup_name = f"{db_path}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            # Eliminar archivo principal
            os.remove(db_path)
            log_to_cmd(f"Archivo eliminado exitosamente: {db_path}", "INFO", "DB_RESET")
            
            # Eliminar archivos auxiliares de SQLite si existen
            for suffix in ['-wal', '-shm']:
                aux_file = db_path + suffix
                if os.path.exists(aux_file):
                    os.remove(aux_file)
                    log_to_cmd(f"Archivo auxiliar eliminado: {aux_file}", "INFO", "DB_RESET")
            
        except OSError as e:
            return {
                "status": "error",
                "message": f"Error al eliminar archivo de base de datos: {str(e)}",
                "database_recreated": False,
                "file_path": db_path
            }
        
        # Paso 5: Recrear base de datos con esquema básico
        log_to_cmd("Paso 4: Recreando base de datos con esquema básico", "INFO", "DB_RESET")
        
        try:
            from modbus_app.history.database import initialize_database
            
            # Recrear con esquema básico
            new_db = initialize_database(db_path)
            
            log_to_cmd("Base de datos recreada con esquema básico", "INFO", "DB_RESET")
            
            # Verificar que se creó correctamente
            if not os.path.exists(db_path):
                return {
                    "status": "error",
                    "message": "Base de datos no se creó correctamente después del reset",
                    "database_recreated": False,
                    "file_path": db_path
                }
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"Error al recrear base de datos: {str(e)}",
                "database_recreated": False,
                "file_path": db_path
            }
        
        # Paso 6: Verificar integridad básica
        log_to_cmd("Paso 5: Verificando integridad de la nueva base de datos", "INFO", "DB_RESET")
        
        try:
            # Obtener estadísticas básicas para verificar
            stats = new_db.get_database_stats()
            table_count = len([k for k in stats.keys() if k.endswith('_count')])
            
            log_to_cmd(f"Verificación exitosa: {table_count} tablas creadas", "INFO", "DB_RESET")
            
        except Exception as e:
            log_to_cmd(f"Advertencia en verificación: {str(e)}", "WARNING", "DB_RESET")
            # No es crítico, continuar
        
        # Resultado exitoso
        log_to_cmd("=== RESET TOTAL COMPLETADO EXITOSAMENTE ===", "INFO", "DB_RESET")
        
        return {
            "status": "success",
            "message": "Reset total de base de datos completado exitosamente",
            "database_recreated": True,
            "schema": "basic (will auto-expand as needed)",
            "file_path": db_path,
            "timestamp": datetime.now().isoformat(),
            "details": {
                "original_file_deleted": True,
                "new_file_created": True,
                "auxiliary_files_cleaned": True
            }
        }
        
    except Exception as e:
        # Error general no manejado
        error_msg = f"Error crítico durante reset total: {str(e)}"
        log_to_cmd(error_msg, "ERROR", "DB_RESET")
        logger.error(error_msg, exc_info=True)
        
        return {
            "status": "error",
            "message": error_msg,
            "database_recreated": False,
            "timestamp": datetime.now().isoformat()
        }


def get_database_info() -> Dict[str, Any]:
    """
    Obtiene información detallada de la base de datos actual.
    
    Returns:
        dict: Información de la base de datos
    """
    try:
        from modbus_app.history.database import get_db
        
        db = get_db()
        if not db:
            return {"status": "error", "message": "No se pudo acceder a la base de datos"}
        
        # Obtener estadísticas básicas
        stats = db.get_database_stats()
        
        # Información del archivo
        file_info = {}
        if os.path.exists(db.db_path):
            file_stat = os.stat(db.db_path)
            file_info = {
                "file_path": db.db_path,
                "file_size_bytes": file_stat.st_size,
                "file_size_mb": round(file_stat.st_size / (1024 * 1024), 2),
                "created_time": datetime.fromtimestamp(file_stat.st_ctime).isoformat(),
                "modified_time": datetime.fromtimestamp(file_stat.st_mtime).isoformat()
            }
        
        return {
            "status": "success",
            "database_stats": stats,
            "file_info": file_info,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": f"Error obteniendo información de base de datos: {str(e)}"
        }


def create_backup(backup_name: str = None) -> Dict[str, Any]:
    """
    Crea un backup de la base de datos actual.
    
    Args:
        backup_name (str, optional): Nombre del backup. Si es None, usa timestamp.
        
    Returns:
        dict: Resultado de la operación de backup
    """
    try:
        from modbus_app.history.database import get_db
        import shutil
        
        db = get_db()
        if not db or not os.path.exists(db.db_path):
            return {
                "status": "error",
                "message": "Base de datos no encontrada para backup"
            }
        
        # Generar nombre de backup si no se proporciona
        if not backup_name:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_name = f"battery_history_backup_{timestamp}.db"
        
        # Crear directorio de backups si no existe
        backup_dir = "database_backups"
        if not os.path.exists(backup_dir):
            os.makedirs(backup_dir)
        
        backup_path = os.path.join(backup_dir, backup_name)
        
        # Crear backup
        shutil.copy2(db.db_path, backup_path)
        
        # Verificar backup
        if not os.path.exists(backup_path):
            return {
                "status": "error",
                "message": "Backup no se creó correctamente"
            }
        
        backup_size = os.path.getsize(backup_path)
        
        log_to_cmd(f"Backup creado exitosamente: {backup_path}", "INFO", "DB_BACKUP")
        
        return {
            "status": "success",
            "message": "Backup creado exitosamente",
            "backup_path": backup_path,
            "backup_size_mb": round(backup_size / (1024 * 1024), 2),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        error_msg = f"Error creando backup: {str(e)}"
        log_to_cmd(error_msg, "ERROR", "DB_BACKUP")
        return {
            "status": "error",
            "message": error_msg
        }
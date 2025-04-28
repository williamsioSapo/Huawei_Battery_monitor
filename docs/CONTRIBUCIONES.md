# Guía de Contribución

[<- Volver al README principal](../README.md)

¡Las contribuciones son bienvenidas! Si deseas mejorar este proyecto, por favor sigue estos pasos:

## Reportando Errores (Issues)

*   Busca en los "Issues" existentes para ver si tu problema ya ha sido reportado.
*   Si no existe, crea un nuevo "Issue".
*   Describe el problema claramente:
    *   Qué esperabas que sucediera.
    *   Qué sucedió realmente.
    *   Pasos exactos para reproducir el error.
    *   Cualquier mensaje de error relevante (de la consola del backend o la consola del navegador).
    *   Tu sistema operativo, versión de Python, y versión de `pymodbus`.
    *   Información sobre tu hardware de conexión (adaptador, etc.).

## Sugiriendo Mejoras (Issues)

*   Crea un nuevo "Issue" describiendo tu idea.
*   Explica por qué sería útil esta mejora y cómo podría implementarse.

## Enviando Cambios (Pull Requests)

1.  **Haz un "Fork"** del repositorio a tu propia cuenta de GitHub.
2.  **Clona tu "Fork"** a tu máquina local:
    ```bash
    git clone https://github.com/TU_USUARIO/ModbusReader_SR.git
    cd ModbusReader_SR
    ```
3.  **Crea una nueva rama** para tus cambios. Usa un nombre descriptivo (ej. `feature/agregar-soporte-tcp` o `fix/corregir-error-conexion`):
    ```bash
    git checkout -b nombre-de-tu-rama
    ```
4.  **Realiza tus cambios** en el código. Asegúrate de seguir el estilo de código existente.
5.  **Añade y haz "commit"** de tus cambios con mensajes claros:
    ```bash
    git add .
    git commit -m "feat: Agrega soporte inicial para Modbus TCP"
    # o
    git commit -m "fix: Corrige manejo de excepciones en desconexión"
    ```
    *(Intenta seguir convenciones como [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/) si es posible).*
6.  **Haz "Push"** de tu rama a tu "Fork" en GitHub:
    ```bash
    git push origin nombre-de-tu-rama
    ```
7.  **Abre un "Pull Request" (PR)** desde tu rama en tu "Fork" hacia la rama `main` (o la rama principal) del repositorio original (`nestorcal/ModbusReader_SR`).
8.  **Describe tus cambios** en el Pull Request, explicando qué hacen y por qué son necesarios. Si solucionan un "Issue" existente, referencia el número del Issue (ej. `Cierra #12`).
9.  Espera la revisión. Puede que se te pidan cambios antes de que el PR sea aceptado.

¡Gracias por contribuir!

[<- Volver al README principal](../README.md)
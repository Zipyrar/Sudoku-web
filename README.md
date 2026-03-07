# Sudoku-web
<p align="left">🚧<img src="https://img.shields.io/badge/Estado%20-%20En%20desarrollo-red"/>🚧</p>

<h3><u>Índice</u></h3>

- [Descripción del proyecto](#descripción-del-proyecto)  
- [Funcionalidades](#funcionalidades)  
- [Descargar, descomprimir y ejecutar el proyecto](#descargar-descomprimir-y-ejecutar-el-proyecto)  
- [Tecnologías usadas](#tecnologías-usadas)
- [Tareas](#tareas)
- [Desarrollador del Proyecto](#desarrollador)  
- [Licencia](#licencia)  

<br/>
<h3>Descripción del proyecto</h3>
<hr/> 
<p> Este proyecto consiste en una aplicación web de Sudoku desarrollada como proyecto intermodular del ciclo de Desarrollo de Aplicaciones Web. </p> 
<p> La aplicación permite a los usuarios registrarse, iniciar sesión y jugar partidas de Sudoku de diferentes niveles de dificultad. Las partidas pueden guardarse en una base de datos para continuar posteriormente y consultar estadísticas personales. </p> 
<p> El objetivo principal del proyecto es aplicar de forma práctica los conocimientos adquiridos en HTML, CSS, JavaScript, PHP y bases de datos, prestando especial atención a la seguridad, la arquitectura del software y la experiencia de usuario. </p>
<br/>
<h3>🧩<u>Funcionalidades</u>🧩</h3>
<hr/>
<ul>
  <li>Registro e inicio de sesión de usuarios.</li> 
  <li>Generación de sudokus de diferentes dificultades.</li> 
  <li>Validación de jugadas en tiempo real.</li> 
  <li>Guardado y recuperación de partidas.</li> 
  <li>Estadísticas de partidas jugadas y completadas.</li> 
  <li>Diseño responsive para móviles, tablets y escritorio.</li>
</ul>
<br/>
<h3>📁<u>Descargar, descomprimir y ejecutar el proyecto</u>📂</h3>
<hr/>
<p>Ve al Github principal, pincha en '<> Code' y le das a <b>'Download ZIP'</b>.</p>
<p>Descomprime la carpeta .zip haciendo clic derecho, y pulsando en la opción 'Extraer todo' o 'Extraer aquí'.</p>
<p>Te aparecerá otra carpeta con el mismo nombre dentro del <u>Sudoku-web</u>. Para más comodidad, saca esa carpeta de dentro, para que sea más directo.</p>
<p><b>Advertencia: no mover ningún archivo de lugar o cambiarle el nombre, podría provocar errores.</b></p>

<p>Una vez descomprimido, necesitarás descargar XAMPP (necesario para poder registrarse e iniciar sesión):</p>
<ul>
  <li>Ve a https://www.apachefriends.org/</li>
  <li>Descarga la versión correspondiente a tu sistema operativo ('XAMPP for ...')</li>
  <li>Ejecuta el instalador y espera a que finalice la instalación.</li>
  <li>Una vez instalado, ejecuta 'XAMPP Control Panel', y dale a 'Start' en Apache y MySQL.</li>
  <li>Deberían ponerse en verde si todo fue bien.</li>
  <li>En el explorador de archivos, ve a <code>C:\xampp\htdocs</code> (o donde hayas instalado XAMPP).</li>
  <li>Copia o mueve la carpeta <code>Sudoku-web</code> dentro de <code>htdocs</code>.</li>
</ul>

<p>A continuación hay que crear la base de datos:</p>
<ul>
  <li>Abre el navegador y ve a <a href="http://localhost/phpmyadmin">http://localhost/phpmyadmin</a>.</li>
  <li>En el panel izquierdo pulsa <b>Nueva</b>, escribe <code>sudoku_web</code> como nombre y pulsa <b>Crear</b>.</li>
  <li>Con <code>sudoku_web</code> seleccionada, ve a la pestaña <b>Importar</b>.</li>
  <li>Pulsa <b>Seleccionar archivo</b> y busca <code>Sudoku-web/assets/db/sudoku_web.sql</code>.</li>
  <li>Pulsa <b>Importar</b> y espera a que finalice.</li>
</ul>

<p>Una vez completado, accede al proyecto desde el navegador mediante:</p>
<p><a href="http://localhost/Sudoku-web/"><u>http://localhost/Sudoku-web/</u></a></p>

<h4>Acceso desde móvil u otros dispositivos</h4>
<p>Si quieres acceder desde un móvil o tablet conectado a la misma red WiFi, primero hay que permitir el acceso externo en Apache:</p>
<ul>
  <li>En el explorador de archivos, va a <code>C:\xampp\apache\conf\extra</code> y abre <code>httpd-vhosts.conf</code>.</li>
  <li>Añade al final del archivo lo siguiente:</li>
</ul>

```apache
<VirtualHost *:80>
    DocumentRoot "C:/xampp/htdocs"
    ServerName localhost
    <Directory "C:/xampp/htdocs">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

<ul>
  <li>Guarda el archivo y reinicia Apache desde el panel de XAMPP.</li>
  <li>Averigua la IP del PC: abre el símbolo del sistema (<code>cmd</code>) y ejecuta <code>ipconfig</code>. Busca la línea <b>Dirección IPv4</b> (algo como <code>192.XXX.X.X</code>).</li>
  <li>Desde el móvil, con la misma red WiFi, entra a <code>http://[IP]/Sudoku-web/</code> sustituyendo la IP por la tuya.</li>
</ul>

<br/>
<h3><u>Tecnologías usadas</u></h3>
<hr/>
  <ul>
    <li>HTML: Es la base de la aplicación Web.</li>
    <li>CSS: Decora la web y la hace diseño responsive (se ajusta al tamaño de la pantalla).</li>
    <li>JavaScript: Contiene la lógica.</li>
    <li>PHP: Permite crear una cuenta y guardar información (guardar partida, estadísticas...)</li>
    <li>MariaDB: Crea la base de datos con un SQL.</li>
  </ul>
<br/>
<h3><u>Tareas</u></h3>
<hr/>

- [x] Hacer HTML de:
  - [x] Página principal.
  - [x] Juego de Sudoku.
  - [x] Estadísticas.
  - [x] Registro.
  - [x] Inicio de sesión.

- [x] Crear los CSS para los HTML:
  - [x] General (para todos los html).
  - [x] Principal.
  - [x] Sudoku.
  - [x] Estadísticas.
  - [x] Inicio y registro.

- [x] Hacer PHP para:
  - [x] Registro.
  - [x] Inicio de sesión.
  - [x] Cerrar sesión.
  - [x] Juego de Sudoku.
  - [x] Estadísticas.

- [x] Usar JavaScript:
  - [x] Inicio y registro.
  - [x] Generar Sudokus.
  - [x] Estadísticas.

- [x] Usar SQL con MariaDB.

<br/>
<h3>🤵<u>Desarrollador</u></h3>
<hr/>
<p><img src="https://github.com/user-attachments/assets/d02d9333-4b01-4801-ba56-fa7795e27da9" width="300" height="300"/><br/><sub>Alonso García Castiñeira</sub></p>
<br/>
<h3><u>Licencia</u></h3>
<hr/>
<p>Este proyecto está licenciado bajo Creative Commons 
Atribución-NoComercial 4.0 Internacional (CC BY-NC 4.0).
https://creativecommons.org/licenses/by-nc/4.0/
</p>
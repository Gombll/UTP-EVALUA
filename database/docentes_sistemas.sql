USE utp_evalua;

START TRANSACTION;

INSERT INTO docentes (
    nombres,
    apellidos,
    correo,
    fotografia,
    facultad_id,
    carrera_id
) VALUES
('Emmanuel Jossuet', 'Bereche Quintana', 'docente1@utp.edu.pe', NULL, 1, 2),
('Teofilo Roberto', 'Correa Calle', 'docente2@utp.edu.pe', NULL, 1, 2),
('Velissa Denith Stephany', 'Alban Panta', 'docente3@utp.edu.pe', NULL, 1, 2),
('Maria Yedidia', 'Alburqueque Trelles', 'docente4@utp.edu.pe', NULL, 1, 2),
('Felix Augusto', 'Chunga Salcedo', 'docente5@utp.edu.pe', NULL, 1, 2),
('Carlos Alberto', 'Galvez Dioses', 'docente6@utp.edu.pe', NULL, 1, 2),
('Yojani', 'Palacios Ladines', 'docente7@utp.edu.pe', NULL, 1, 2),
('Maritza Mercedes', 'Ramos Mendives', 'docente8@utp.edu.pe', NULL, 1, 2),
('Victor Hugo', 'Vilela Vargas', 'docente9@utp.edu.pe', NULL, 1, 2),
('Oswaldo Kenky Kenyo', 'Estrada Pacherres', 'docente10@utp.edu.pe', NULL, 1, 2),
('Rosa Liliana', 'Palacios Farfan', 'docente11@utp.edu.pe', NULL, 1, 2),
('Marco Antonio', 'Soto Guzman', 'docente12@utp.edu.pe', NULL, 1, 2),
('Jose Luis Eduardo', 'Velasquez Chunga', 'docente13@utp.edu.pe', NULL, 1, 2),
('Albert Alexis', 'Arteaga Alcibar', 'docente14@utp.edu.pe', NULL, 1, 2),
('Oscar Eduardo', 'Balcazar Chumacero', 'docente15@utp.edu.pe', NULL, 1, 2),
('Lidia Marleny', 'Quinde Nuñez', 'docente16@utp.edu.pe', NULL, 1, 2),
('Wendy', 'Dominguez Oliva', 'docente17@utp.edu.pe', NULL, 1, 2),
('Javier Eduardo', 'Jaramillo Atoche', 'docente18@utp.edu.pe', NULL, 1, 2),
('Bernardo', 'Rivera Abad', 'docente19@utp.edu.pe', NULL, 1, 2),
('Irvin Andre', 'Silva Cordova', 'docente20@utp.edu.pe', NULL, 1, 2),
('Jesus Javier', 'Cobeñas Morales', 'docente21@utp.edu.pe', NULL, 1, 2),
('Cesar', 'Silva More', 'docente22@utp.edu.pe', NULL, 1, 2),
('Juan Antonio', 'Alcantara Nuñez', 'docente23@utp.edu.pe', NULL, 1, 2),
('Ricardo Manuel', 'Arias Velasquez', 'docente24@utp.edu.pe', NULL, 1, 2),
('Erika Edith', 'Arroyo Condeña', 'docente25@utp.edu.pe', NULL, 1, 2),
('Whiston Kendrick', 'Borja Reyna', 'docente26@utp.edu.pe', NULL, 1, 2),
('Jose Luis', 'Briones Zuñiga', 'docente27@utp.edu.pe', NULL, 1, 2),
('Renato David', 'Castillo Galdo', 'docente28@utp.edu.pe', NULL, 1, 2),
('Yimy Paul', 'Chuquihuanga Villegas', 'docente29@utp.edu.pe', NULL, 1, 2),
('Jaime Jose', 'Saenz Dedios', 'docente30@utp.edu.pe', NULL, 1, 2),
('Letty Angelica', 'Huacchillo Pardo', 'docente31@utp.edu.pe', NULL, 1, 2),
('Guido Franco', 'Montero Chavez', 'docente32@utp.edu.pe', NULL, 1, 2),
('Deysi Aime', 'Nunura Silva', 'docente33@utp.edu.pe', NULL, 1, 2),
('Luis Alberto', 'Sanchez Salazar', 'docente34@utp.edu.pe', NULL, 1, 2),
('Ruben Edmundo', 'Silupu Ortega', 'docente35@utp.edu.pe', NULL, 1, 2),
('Jessica Karina', 'Torres Caceres', 'docente36@utp.edu.pe', NULL, 1, 2),
('Ronald', 'Verastegui Sanchez', 'docente37@utp.edu.pe', NULL, 1, 2),
('Rolando Elias', 'Ipanaque Silva', 'docente38@utp.edu.pe', NULL, 1, 2),
('Manuel Antonio', 'Cobeñas Chanduvi', 'docente39@utp.edu.pe', NULL, 1, 2),
('Luis Armando', 'Saavedra Yarleque', 'docente40@utp.edu.pe', NULL, 1, 2)
ON DUPLICATE KEY UPDATE
    nombres = VALUES(nombres),
    apellidos = VALUES(apellidos),
    fotografia = VALUES(fotografia),
    facultad_id = VALUES(facultad_id),
    carrera_id = VALUES(carrera_id),
    updated_at = CURRENT_TIMESTAMP;

COMMIT;

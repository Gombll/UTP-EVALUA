USE utp_evalua;

INSERT IGNORE INTO facultades (id, nombre) VALUES
(1, 'Ingenieria'),
(2, 'Gestion y Negocios');

INSERT IGNORE INTO carreras (id, nombre, facultad_id) VALUES
(1, 'Ingenieria de Software', 1),
(2, 'Ingenieria de Sistemas', 1),
(3, 'Administracion', 2);

-- Las claves reales se generan con `flask seed`; este archivo deja datos maestros base.

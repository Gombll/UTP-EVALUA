docente_destacado(Nombre) :- promedio_docente(Nombre, Promedio), Promedio > 4.5.
docente_con_mas_50_resenas(Nombre) :- cantidad_resenas(Nombre, Cantidad), Cantidad > 50.
docente_de_ingenieria(Nombre) :- docente_facultad(Nombre, Facultad), Facultad = 'Ingenieria'.
facultad_necesita_seguimiento(Nombre) :- promedio_facultad(Nombre, Promedio), Promedio < 3.0.
mejor_carrera(Nombre) :- promedio_carrera(Nombre, Promedio), \+ (promedio_carrera(_, Otro), Otro > Promedio).

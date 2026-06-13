Definicion inicial de requerimientos

Quiero que construyas una aplicacion web full stack. El frontend debe estar hecho en React y el backend en NodeJS, ambos usando TypeScript. La aplicacion debe almacenar la informacion de distintas propiedades (casas o departamentos) disponibles para alquilar. El frontend debe mostrar la informacion de la propiedad:

* cantidad de habitaciones 

* cantidad de personas que se pueden hospedar 

* fotos de la propiedad

* servicios disponibles en la propiedad -> wifi, estacionamiento, parrilla, aire acondicionado, cocina equipada

* costo del alquiler por dia en diferentes monedas usando como referencia al USD.

* cantidad de estrellas que tiene la habitacion (maximo 5) que se calculan en base a las estrellas que usuarios anteriores le han asignado.

* Opiniones sobre la propiedad

Quiero que la app maneje las reservas de dichas propiedades de manera segura, que la reserva sea en una transaccion y que si no se puede efectuar la reserva se le informe al usuario con un mensaje de error.

Deben haber reservas que puedan ser reembolsables y reservas que no lo sean.

Siempre se debe poder cancelar la reserva, en caso de que no sea reembolsable, se cobrara una penalidad configurable.

El pago de la reserva debe estar en la misma transaccion en la que se crea la reserva y en caso de que falle la creacion de la reserva o el pago, toda la transaccion debe fallar.

Por ahora la propiedad va a tener los atributos arriba mencionados, pero la aplicacion debe hacerse de manera de que se puedan agregarse mas atributos para la propiedad en el futuro.

El backend y el frontend deben estar en aplicaciones separadas y se debe usar una arquitectura de microservicios. Backend y frontend deben ser dockerizados.

Hace una documentacion detallada de lo que hace el codigo.

Deben crearse tests unitarios y de integracion.

Debe crearse un readme con las instrucciones para ejecutar el backend y el frontend en modo debug.

Deben usarese nombres significativos para las variables

Deben seguirse buenas practicas en el desarrollo en esta app

El lenguaje en del codigo generado debe ser ingles (nombres de variables, entidades, etc)

Utiliza bases de datos relacionales y si para algunas entidades conviene usar no relacionales, podes usarlas tambien

Los paramtetros de las conexiones a las bases deben estar en archivos de configuracion
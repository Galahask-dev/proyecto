function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <h2 className="text-lg font-bold text-white mb-4">{title}</h2>
      <div className="space-y-3 text-sm text-zinc-400">{children}</div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="inline-flex items-center rounded bg-zinc-800 px-2 py-0.5 font-mono text-xs text-accent">
      {children}
    </code>
  );
}

function GradeRow({
  grade,
  color,
  desc,
}: {
  grade: string;
  color: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-zinc-800/50 last:border-0">
      <span className={`font-semibold w-20 shrink-0 ${color}`}>{grade}</span>
      <span className="text-zinc-400">{desc}</span>
    </div>
  );
}

export default function InfoTab() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center py-4">
        <h1 className="text-3xl font-bold text-white">Info</h1>
        <p className="text-zinc-400 mt-2">Cómo funciona el profiler, qué significan los números y cómo se asignan las grades.</p>
      </div>

      <Section title="Cómo se recopilan los datos">
        <p>
          FiveM tiene un profiler incorporado que funciona a nivel del runtime C++. No necesitas tocar ningún script.
          Cuando ejecutas <Code>profiler record 300</Code>, el scheduler Citizen Lua de FiveM envuelve cada thread tick
          en cada recurso con timing preciso automáticamente.
        </p>
        <p>
          El runtime rastrea qué recurso posee cada coroutine de Lua, por lo que registra el tiempo de ejecución de todos
          ellos, incluidos los recursos escrowed. El nombre del recurso nunca está encriptado, solo el código dentro de él,
          por eso ves entradas como <Code>Escrowed (qbx_core)</Code>.
        </p>
        <p>
          Cuando la grabación termina, ejecuta <Code>profiler saveJSON myprofile</Code>. Descarga ese archivo de tu servidor
          y súbelo aquí.
        </p>
      </Section>

      <Section title="Server ticks y el budget de 50ms">
        <p>
          Un servidor FiveM corre a 20 ticks por segundo — un tick cada 50ms. Dentro de cada tick, los threads, event
          handlers y comandos de todos los recursos se ejecutan uno tras otro.
        </p>
        <p>
          El profiler agrupa eventos en ticks buscando <strong className="text-white">gaps de más de 15ms</strong> entre
          eventos consecutivos. Ese gap es el servidor en idle esperando el próximo ciclo de tick. Todo dentro del gap se
          cuenta como un tick.
        </p>
        <p>
          El <em>script time per tick</em> en los resultados es el tiempo total de ejecución Lua de todos los recursos en
          un solo tick. <strong className="text-white">5ms/tick está bien.</strong>{' '}
          40ms/tick deja casi sin margen para networking y entity sync — cuando los jugadores empiezan a sentir lag.
        </p>
      </Section>

      <Section title="Heavy ticks">
        <p>
          Un tick se marca como <strong className="text-white">heavy</strong> cuando la ejecución total de scripts supera
          los <strong className="text-white">25ms</strong> — la mitad del budget de 50ms. Una vez que los scripts
          consumen más de la mitad del budget, queda muy poco para todo lo demás que el servidor necesita hacer.
        </p>
        <p>
          El gráfico de timeline muestra cada tick como una barra. Verde está bien, amarillo se acerca, rojo es heavy.
          Hover sobre cualquier barra para ver qué estaba corriendo durante ese tick.
        </p>
      </Section>

      <Section title="Top 20 Worst Scripts">
        <div className="space-y-4">
          <div>
            <p className="font-semibold text-white mb-1">CPU HOG</p>
            <p>
              Mayor tiempo total de CPU en toda la grabación. Este script corrió mucho, corrió lento, o ambas cosas.
              Empieza aquí cuando busques lo que está drenando tu servidor.
            </p>
          </div>
          <div>
            <p className="font-semibold text-white mb-1">SPIKE</p>
            <p>
              El peor tick individual registrado. Un script puede verse bien en promedio pero tener spikes fuertes en
              ocasiones — desde una query de base de datos, iterando sobre todos los jugadores, o un callback sin cache.
              Estos spikes son los que los jugadores realmente sienten.
            </p>
          </div>
          <div>
            <p className="font-semibold text-white mb-1">HITCH DRIVER</p>
            <p>
              Apareció durante heavy ticks. Cuenta cuántas veces un recurso estuvo entre los top runners durante un tick
              flaggeado. No tiene que ser el script más grande — simplemente sigue apareciendo cuando las cosas salen mal.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Grades">
        <GradeRow
          grade="Excellent"
          color="text-emerald-400"
          desc="Menos de 5ms por tick, menos del 1% de heavy ticks. Los scripts usan una muy pequeña porción del budget."
        />
        <GradeRow
          grade="Good"
          color="text-green-400"
          desc="Menos de 10ms por tick, menos del 5% de heavy ticks. Carga normal con spikes menores. Nada necesita cambiar."
        />
        <GradeRow
          grade="Fair"
          color="text-yellow-400"
          desc="Menos de 20ms por tick, menos del 15% de heavy ticks. Los scripts ocupan un chunk real de cada tick. Vale la pena revisar los top offenders."
        />
        <GradeRow
          grade="Poor"
          color="text-orange-400"
          desc="Menos de 30ms por tick, menos del 30% de heavy ticks. Carga alta. Los jugadores probablemente están notando issues. Empieza a optimizar."
        />
        <GradeRow
          grade="Critical"
          color="text-red-400"
          desc="30ms o más por tick, o 30% o más de heavy ticks. El servidor no puede mantenerse al día. Lag y desync son esperados."
        />
      </Section>

      <Section title="Cómo grabar un profile">
        <ol className="list-decimal list-inside space-y-2">
          <li>Abre tu consola txAdmin</li>
          <li>Ejecuta <Code>profiler record 300</Code></li>
          <li>Espera aproximadamente 15 segundos para que termine</li>
          <li>Ejecuta <Code>profiler saveJSON myprofile</Code></li>
          <li>Descarga el archivo desde la carpeta resources de tu servidor</li>
          <li>Súbelo en la pestaña Profiler Analyzer</li>
        </ol>
        <p className="mt-2 text-zinc-500 italic">
          Graba mientras hay jugadores online para obtener resultados precisos.
        </p>
      </Section>
    </div>
  );
}

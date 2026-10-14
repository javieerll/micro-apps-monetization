// Generador de reserva. Funciona en el navegador y en el servidor.
// Si no hay clave de Groq u OpenAI, la app sigue devolviendo hooks útiles.

(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HookTemplates = api;
})(typeof self !== 'undefined' ? self : this, function () {
  var PATTERNS = {
    directo: [
      function (topic) { return 'Deja de complicar ' + topic + '.'; },
      function (topic) { return 'Si ' + topic + ' no te funciona, quita esto.'; },
      function (topic) { return 'El paso de ' + topic + ' que casi todo el mundo salta.'; },
      function (topic) { return 'No necesitas más ' + topic + '. Necesitas menos.'; },
      function (topic) { return 'Para de buscar el truco de ' + topic + '.'; },
      function (topic) { return 'Un cambio pequeño en ' + topic + ' y se nota hoy.'; }
    ],
    historia: [
      function (topic) { return 'El día que ' + topic + ' me salió mal delante de alguien.'; },
      function (topic) { return 'Llevo 30 días con ' + topic + '. El día 4 casi lo dejo.'; },
      function (topic) { return 'Antes odiaba ' + topic + '. Hasta que cambié una cosa.'; },
      function (topic) { return 'La primera vez que probé ' + topic + ' lo hice todo al revés.'; },
      function (topic) { return 'Alguien me corrigió ' + topic + ' en diez segundos.'; },
      function (topic) { return 'Empecé ' + topic + ' por cabezonería. Mira en qué acabó.'; }
    ],
    polemico: [
      function (topic) { return 'El consejo de ' + topic + ' que te está frenando.'; },
      function (topic) { return 'Nadie que viva de ' + topic + ' hace lo que te dicen.'; },
      function (topic) { return 'La parte incómoda de ' + topic + ' es la que cuenta.'; },
      function (topic) { return 'No copies ' + topic + ' de quien ya llegó.'; },
      function (topic) { return topic + ' está sobrevalorado. Menos esta parte.'; },
      function (topic) { return 'Borrar esto de ' + topic + ' me quitó un problema.'; }
    ],
    util: [
      function (topic) { return '3 errores de ' + topic + ' que se arreglan hoy.'; },
      function (topic) { return 'Haz ' + topic + ' en este orden, no en el otro.'; },
      function (topic) { return 'Si solo tienes 10 minutos para ' + topic + ', haz esto.'; },
      function (topic) { return 'Antes de ' + topic + ', mira estos dos detalles.'; },
      function (topic) { return 'La lista corta de ' + topic + ' que sí uso.'; },
      function (topic) { return 'Un guion de 20 segundos para ' + topic + '.'; }
    ],
    curioso: [
      function (topic) { return 'Lo raro de ' + topic + ' es que funciona al revés.'; },
      function (topic) { return 'Hay un detalle de ' + topic + ' que casi nadie mira.'; },
      function (topic) { return 'Esto de ' + topic + ' parece tonto. No lo es.'; },
      function (topic) { return 'El minuto 1 de ' + topic + ' decide el resto.'; },
      function (topic) { return 'Una pregunta de ' + topic + ' que lo cambia.'; },
      function (topic) { return 'Lo que sobra en ' + topic + ' suele ser lo más visible.'; }
    ]
  };

  var NOTES = {
    directo: 'Di la frase y enseña el ejemplo en el segundo 3. Sin presentación.',
    historia: 'Empieza por el momento incómodo. El consejo va al final, en una frase.',
    polemico: 'Sostén la frase un segundo. Luego da un solo motivo.',
    util: 'Una idea por frase. Corta antes de explicar de más.',
    curioso: 'No resuelvas el misterio en la primera frase. Resuélvelo con un ejemplo.'
  };

  var CTAS = {
    tiktok: 'Guárdalo y pruébalo hoy.',
    reels: 'Envíaselo a quien lo necesita.',
    shorts: 'Comenta si te ha pasado.',
    instagram: 'Léelo otra vez antes de cerrar.'
  };

  var LABELS = {
    directo: 'Directo',
    historia: 'Historia',
    polemico: 'Polémico',
    util: 'Útil',
    curioso: 'Curioso'
  };

  function clean(topic) {
    var text = String(topic || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
    if (text.length > 180) text = text.slice(0, 180);
    return text || 'tu tema';
  }

  function shuffle(list) {
    var copy = list.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function generate(options) {
    var topic = clean(options && options.topic);
    var tone = PATTERNS[options && options.tone] ? options.tone : 'directo';
    var platform = CTAS[options && options.platform] ? options.platform : 'tiktok';
    var own = shuffle(PATTERNS[tone]).slice(0, 3).map(function (fn) {
      return { tone: tone, text: fn(topic) };
    });
    var rest = [];
    Object.keys(PATTERNS).forEach(function (key) {
      if (key === tone) return;
      PATTERNS[key].forEach(function (fn) {
        rest.push({ tone: key, text: fn(topic) });
      });
    });
    var chosen = own.concat(shuffle(rest).slice(0, 2));
    return {
      hooks: chosen.map(function (item) {
        return {
          hook: item.text,
          caption: item.text + '\n\n' + NOTES[item.tone],
          cta: CTAS[platform],
          pattern: LABELS[item.tone] || item.tone
        };
      })
    };
  }

  return { generate: generate, clean: clean };
});

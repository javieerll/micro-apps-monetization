// Cálculo de una factura española sencilla.
// Cada línea se redondea a céntimos. El IVA y el IRPF salen de la suma de esas líneas.
// Total = base + IVA − retención.

(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FacturaCalc = api;
})(typeof self !== 'undefined' ? self : this, function () {
  function cents(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.round((number + Number.EPSILON) * 100);
  }

  function euros(centsValue) {
    return centsValue / 100;
  }

  function calcInvoice(lines, ivaRate, irpfRate) {
    var iva = Number(ivaRate);
    var irpf = Number(irpfRate);
    if (!Number.isFinite(iva) || iva < 0) iva = 0;
    if (!Number.isFinite(irpf) || irpf < 0) irpf = 0;

    var clean = (lines || []).map(function (line) {
      var qty = Number(line.qty);
      var price = Number(line.price);
      if (!Number.isFinite(qty) || qty < 0) qty = 0;
      if (!Number.isFinite(price) || price < 0) price = 0;
      // Primero se redondea el precio unitario. El importe sale de ese precio ya redondeado.
      var unitCents = cents(price);
      var amount = cents(qty * (unitCents / 100));
      return {
        concept: String(line.concept || '').trim(),
        qty: qty,
        price: euros(unitCents),
        amount: euros(amount),
        amountCents: amount
      };
    }).filter(function (line) {
      return line.concept && line.qty > 0 && line.amountCents > 0;
    });

    var baseCents = clean.reduce(function (sum, line) {
      return sum + line.amountCents;
    }, 0);
    var ivaCents = Math.round(baseCents * iva);
    var irpfCents = Math.round(baseCents * irpf);
    var totalCents = baseCents + ivaCents - irpfCents;

    return {
      lines: clean.map(function (line) {
        return {
          concept: line.concept,
          qty: line.qty,
          price: line.price,
          amount: line.amount
        };
      }),
      base: euros(baseCents),
      ivaRate: iva,
      iva: euros(ivaCents),
      irpfRate: irpf,
      irpf: euros(irpfCents),
      total: euros(totalCents)
    };
  }

  return { calcInvoice: calcInvoice };
});

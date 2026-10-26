/* Age Calc — pure calendar-day arithmetic (no Date maths, so no timezone or DST surprises). */
(function () {
  "use strict";
  var $ = S3.$, $$ = S3.$$;
  var KEY = "age.v1";
  var ZODIAC = [[1, 20, "Aquarius", "♒"], [2, 19, "Pisces", "♓"], [3, 21, "Aries", "♈"], [4, 20, "Taurus", "♉"], [5, 21, "Gemini", "♊"], [6, 21, "Cancer", "♋"],
    [7, 23, "Leo", "♌"], [8, 23, "Virgo", "♍"], [9, 23, "Libra", "♎"], [10, 23, "Scorpio", "♏"], [11, 22, "Sagittarius", "♐"], [12, 22, "Capricorn", "♑"]];
  var ANIMALS = ["Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake", "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"];
  var out = "";

  // ---------- calendar maths on {y, m, d} (proleptic Gregorian) ----------
  function isLeap(y) { return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0); }
  function dim(y, m) { return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]; }
  // Days since 1970-01-01 (H. Hinnant's days_from_civil).
  function dfc(o) {
    var y = o.y - (o.m <= 2 ? 1 : 0), era = Math.floor(y / 400), yoe = y - era * 400;
    var doy = Math.floor((153 * (o.m + (o.m > 2 ? -3 : 9)) + 2) / 5) + o.d - 1;
    return era * 146097 + yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy - 719468;
  }
  function cfd(z) {
    z += 719468;
    var era = Math.floor(z / 146097), doe = z - era * 146097;
    var yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
    var doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100)), mp = Math.floor((5 * doy + 2) / 153);
    var m = mp + (mp < 10 ? 3 : -9);
    return { y: yoe + era * 400 + (m <= 2 ? 1 : 0), m: m, d: doy - Math.floor((153 * mp + 2) / 5) + 1 };
  }
  // Add months; the day clamps to the end of a shorter month (Jan 31 + 1 month = Feb 28/29).
  function addMonths(o, k) { var t = o.y * 12 + o.m - 1 + k, y = Math.floor(t / 12), m = t - y * 12 + 1; return { y: y, m: m, d: Math.min(o.d, dim(y, m)) }; }
  // Whole years, months, days from a to b (a <= b).
  function diff(a, b) {
    var months = (b.y - a.y) * 12 + (b.m - a.m), anchor = addMonths(a, months);
    if (dfc(anchor) > dfc(b)) { months--; anchor = addMonths(a, months); }
    return { y: Math.floor(months / 12), m: months % 12, d: dfc(b) - dfc(anchor), months: months, days: dfc(b) - dfc(a) };
  }
  function parse(v) {
    var m = /^(\d{4,})-(\d{2})-(\d{2})$/.exec(v || "");
    if (!m) return null;
    var o = { y: +m[1], m: +m[2], d: +m[3] };
    return o.y >= 1 && o.m >= 1 && o.m <= 12 && o.d >= 1 && o.d <= dim(o.y, o.m) ? o : null;
  }
  function iso(o) { return String(o.y).padStart(4, "0") + "-" + String(o.m).padStart(2, "0") + "-" + String(o.d).padStart(2, "0"); }
  function todayLocal() { var t = new Date(); return { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() }; }
  function weekday(o) { return ["Thursday", "Friday", "Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"][((dfc(o) % 7) + 7) % 7]; }
  function asDate(o) { var d = new Date(0); d.setUTCFullYear(o.y, o.m - 1, o.d); return d; }
  function nice(o) { return Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(asDate(o)); }
  function hijri(o, locale) {
    try { return Intl.DateTimeFormat(locale + "-u-ca-islamic-umalqura", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(asDate(o)); }
    catch (e) { return ""; }
  }
  function hijriParts(o) {
    try {
      var p = {};
      Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { timeZone: "UTC", day: "numeric", month: "numeric", year: "numeric" })
        .formatToParts(asDate(o)).forEach(function (x) { if (/^(year|month|day)$/.test(x.type)) p[x.type] = parseInt(x.value, 10); });
      return p.year ? { y: p.year, m: p.month, d: p.day } : null;
    } catch (e) { return null; }
  }
  function zodiac(o) { var z = ZODIAC[11]; ZODIAC.forEach(function (s) { if (o.m > s[0] || (o.m === s[0] && o.d >= s[1])) z = s; }); return z[2] + " " + z[3]; }
  function animal(y) { return ANIMALS[((y - 4) % 12 + 12) % 12]; }

  // ---------- UI ----------
  function plural(n, w) { return n.toLocaleString() + " " + w + (n === 1 ? "" : "s"); }
  function ymd(a) { return [a.y && plural(a.y, "year"), a.m && plural(a.m, "month"), (a.d || (!a.y && !a.m)) && plural(a.d, "day")].filter(Boolean).join(", "); }
  function stat(label, value) { return '<div class="stat"><b>' + S3.esc(value) + "</b><span>" + S3.esc(label) + "</span></div>"; }
  function fact(title, main, sub, cls) {
    return '<div class="fact ' + (cls || "") + '"><small>' + S3.esc(title) + "</small><b>" + S3.esc(main) + "</b>" + (sub || "") + "</div>";
  }

  function render() {
    S3.store(KEY, { dob: $("#dob").value, name2: $("#name2").value, dob2: $("#dob2").value });
    var dob = parse($("#dob").value), on = parse($("#on").value) || todayLocal(), err = $("#err");
    var isToday = dfc(on) === dfc(todayLocal());
    err.textContent = "";
    $("#cmp").innerHTML = "";
    if (!dob) {
      $("#hero").innerHTML = '<div class="empty"><b>Enter your date of birth</b>Everything is worked out on this device.</div>';
      $("#totals").innerHTML = ""; $("#facts").innerHTML = ""; out = ""; return;
    }
    if (dfc(dob) > dfc(on)) {
      err.textContent = "The birth date is after the \"age on\" date.";
      $("#hero").innerHTML = '<div class="empty"><b>Not born yet</b>' + S3.esc(plural(dfc(dob) - dfc(on), "day")) + " to go.</div>";
      $("#totals").innerHTML = ""; $("#facts").innerHTML = ""; out = ""; return;
    }
    var a = diff(dob, on);
    var big = [[a.y, "year"], [a.m, "month"], [a.d, "day"]].map(function (p) { return "<b>" + p[0] + "</b><span>" + p[1] + (p[0] === 1 ? "" : "s") + "</span>"; });
    $("#hero").innerHTML = '<div class="big">' + big.map(function (x) { return "<span>" + x + "</span>"; }).join("") + "</div>" +
      "<p>Born on a <b>" + weekday(dob) + "</b>, " + S3.esc(nice(dob)) + (isToday ? "" : " · age on " + S3.esc(nice(on))) + "</p>";
    $("#totals").innerHTML = stat("months", a.months.toLocaleString()) + stat("weeks" + (a.days % 7 ? " + " + (a.days % 7) + " d" : ""), Math.floor(a.days / 7).toLocaleString()) +
      stat("days", a.days.toLocaleString()) + stat("hours (approx.)", (a.days * 24).toLocaleString());

    // next birthday (Feb 29 birthdays fall on Feb 28 in common years)
    var bdayToday = a.m === 0 && a.d === 0, next = bdayToday ? on : addMonths(dob, 12 * (a.y + 1)), until = dfc(next) - dfc(on);
    var nb = bdayToday ? fact("Birthday", "Happy birthday! 🎉", "<span>You turn " + a.y + " today</span>", "hl") :
      fact("Next birthday", "in " + plural(until, "day"), "<span>" + weekday(next) + ", " + S3.esc(nice(next)) + " · turning " + (a.y + 1) + "</span>", "hl");
    var hEn = hijri(dob, "en"), hAr = hijri(dob, "ar-SA"), hp = hijriParts(dob), ht = hijriParts(on), hAge = "";
    if (hp && ht) hAge = " · Hijri age " + (ht.y - hp.y - (ht.m < hp.m || (ht.m === hp.m && ht.d < hp.d) ? 1 : 0));
    var hj = hEn ? fact("Hijri date of birth", hEn, '<span class="ar" dir="rtl" lang="ar">' + S3.esc(hAr) + "</span><span>Umm al-Qura calendar" + hAge + "</span>") : "";
    var ms = (Math.floor(a.days / 1000) + 1) * 1000, msDate = cfd(dfc(dob) + ms);
    $("#facts").innerHTML = nb + hj +
      fact("Star sign", zodiac(dob), "<span>Chinese zodiac: " + animal(dob.y) + (dob.m <= 2 ? " (or " + animal(dob.y - 1) + " if born before Chinese New Year)" : "") + "</span>") +
      fact("Next milestone", ms.toLocaleString() + " days old", "<span>" + weekday(msDate) + ", " + S3.esc(nice(msDate)) + " · in " + plural(ms - a.days, "day") + "</span>");

    out = "Age: " + ymd(a) + (isToday ? "" : " (on " + nice(on) + ")") + "\nBorn: " + weekday(dob) + ", " + nice(dob) + (hEn ? " (" + hEn + ")" : "") +
      "\nTotal: " + a.days.toLocaleString() + " days, " + Math.floor(a.days / 7).toLocaleString() + " weeks" +
      (bdayToday ? "\nBirthday today!" : "\nNext birthday: " + nice(next) + " (" + weekday(next) + "), in " + plural(until, "day"));

    var dob2 = parse($("#dob2").value);
    if (dob2) {
      var nm = $("#name2").value.trim() || "They", c = $("#cmp");
      var d = dfc(dob2) - dfc(dob), gap = d < 0 ? diff(dob2, dob) : diff(dob, dob2);
      var age2 = dfc(dob2) <= dfc(on) ? diff(dob2, on) : null;
      var line = d === 0 ? S3.h("span", null, [S3.h("b", { text: nm }), " shares your exact birthday!"]) :
        S3.h("span", null, [S3.h("b", { text: nm }), " is ", S3.h("b", { text: ymd(gap) }), (d > 0 ? " younger" : " older") + " than you (" + plural(Math.abs(d), "day") + ")."]);
      c.appendChild(S3.h("div", { "class": "cmp" }, [line, age2 ? " Their age: " + ymd(age2) + "." : " Not born yet on that date."]));
      out += "\n" + c.textContent;
    }
  }

  // ---------- wiring ----------
  var s = S3.store(KEY) || {};
  $("#dob").value = s.dob || ""; $("#name2").value = s.name2 || ""; $("#dob2").value = s.dob2 || "";
  $("#on").value = iso(todayLocal());
  $$("#dob, #on, #dob2, #name2").forEach(function (el) { el.addEventListener("input", render); });
  $("#today").addEventListener("click", function () { $("#on").value = iso(todayLocal()); render(); });
  $("#copy").addEventListener("click", function () {
    if (!out) return S3.toast("Enter your date of birth first", "error");
    S3.copy(out); S3.done();
  });
  render();

  window.S3_DEMO = function () {
    $("#dob").value = "1994-05-15"; $("#on").value = iso(todayLocal()); $("#name2").value = "Sara"; $("#dob2").value = "1997-02-28"; render();
  };

  window.S3_SELFTEST = function () {
    function D(s) { return parse(s); }
    var a = diff(D("1994-05-15"), D("2026-10-26"));
    var b = diff(D("1990-01-31"), D("1990-02-28"));
    var c = diff(D("2000-02-29"), D("2001-02-28"));
    var e = diff(D("2000-01-31"), D("2000-03-01"));             // Jan 31 + 1 month = Feb 29, + 1 day
    var h = hijriParts(D("2000-01-01"));                         // 24 Ramadan 1420
    var r = cfd(dfc(D("1600-02-29")) + 1);
    return a.y === 32 && a.m === 5 && a.d === 11 && b.y === 0 && b.m === 1 && b.d === 0 && c.y === 1 && c.m === 0 && c.d === 0 &&
      e.m === 1 && e.d === 1 && dfc(D("2001-01-01")) - dfc(D("2000-01-01")) === 366 && dfc(D("1970-01-01")) === 0 &&
      weekday(D("2027-05-15")) === "Saturday" && weekday(D("2000-01-01")) === "Saturday" &&
      r.y === 1600 && r.m === 3 && r.d === 1 && !parse("2023-02-29") && !!parse("2024-02-29") &&
      zodiac(D("1994-05-15")) === "Taurus ♉" && zodiac(D("2000-01-19")) === "Capricorn ♑" && zodiac(D("2000-01-20")) === "Aquarius ♒" &&
      animal(2020) === "Rat" && !!h && h.y === 1420 && h.m === 9;
  };
})();

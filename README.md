# Saldo Glasses

<p align="center"><img src="site/images/meta-display-apps-logo.svg" alt="Meta Display Apps" width="74"></p>

**Deine Finanzen auf einen Blick auf Meta Display Glasses.** Kopple Brille und Computer einmal per Kurzcode und erfasse Einnahmen, Ausgaben, Budgets und offene Beträge selbst.

[Saldo öffnen](https://saldo-glasses.henning-orbit-calendar.workers.dev/) · [Brillenansicht](https://saldo-glasses.henning-orbit-calendar.workers.dev/glasses.html) · [Meta Display Apps](https://github.com/Henning1908)

Teil von **Meta Display Apps** · [Orbit Calendar](https://orbit-calendar.henning-orbit-calendar.workers.dev/) · [WebUntis Glasses](https://webuntis-glasses.henning-orbit-calendar.workers.dev/)

<img src="docs/saldo-hero.svg" alt="Saldo zeigt die leere Monatsübersicht auf Computer und Display-Brille" width="100%">

---

## Dein Geld, in deinem Blick

Saldo zeigt deine manuell erfassten Finanzdaten am Computer und auf deiner Brille. Die App startet vollständig leer. Es gibt keine Beispieldaten und keine Bankverknüpfung.

### Loslegen

1. Öffne Saldo in der Meta AI App unter **App connections → Add a Web App** und füge `https://saldo-glasses.henning-orbit-calendar.workers.dev/glasses.html` hinzu.
2. Öffne Saldo auf der Display-Brille. Auf dem Brillendisplay erscheint ein sechsstelliger Code.
3. Öffne die [Saldo Web-App](https://saldo-glasses.henning-orbit-calendar.workers.dev/) auf deinem Computer und gib den Code ein. Er ist zehn Minuten gültig.
4. Erfasse deine Buchungen im Dashboard. Die Brillenansicht aktualisiert sich automatisch.

## Funktionen

- Einnahmen und Ausgaben manuell erfassen, filtern und als CSV exportieren
- Monatsübersicht und Statistiken, die mit deinen eigenen Buchungen beginnen
- Budgets und offene Beträge verwalten
- Brillenansicht mit Monatsübersicht und letzter Buchung
- Spracheingabe im Web-Dashboard, wenn der Browser sie unterstützt

## Datenschutz

- Saldo fragt keine Bankdaten ab und verbindet keine Finanzkonten.
- Der Finanzbereich wird verschlüsselt in Cloudflare D1 gespeichert.
- Brille und Computer werden über einen kurzlebigen Einmalcode verbunden.
- Die Brille erhält nur die angezeigten Finanzübersichten. Sie verlangt keine Zugangsdaten.
- Das Projekt ist für den persönlichen Gebrauch ausgelegt.

## Lokal entwickeln

```sh
npm install
npx wrangler d1 migrations apply saldo-glasses --local
npx wrangler dev
```

Für den lokalen Worker `.dev.vars` mit einem zufälligen `SALDO_ENCRYPTION_KEY` anlegen. Für Cloudflare `npx wrangler secret put SALDO_ENCRYPTION_KEY` verwenden und anschließend `npx wrangler deploy` ausführen.

## Im Meta Display Apps Ökosystem

Saldo folgt demselben Brille-zu-Computer-Kopplungsablauf wie [WebUntis Glasses](https://github.com/Henning1908/WebUntis-Glasses) und fügt sich in die Meta Display Apps Familie rund um [Orbit Calendar](https://github.com/Henning1908/orbit-calendar-glasses) ein.

[Quellcode auf GitHub](https://github.com/Henning1908/Saldo-Glasses) · [Cloudflare Worker](https://saldo-glasses.henning-orbit-calendar.workers.dev/)

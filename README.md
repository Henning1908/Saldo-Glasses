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

- Einnahmen und Ausgaben mit Kategorie, Gruppe, Datum, Zahlungsweg und Beschreibung erfassen, bearbeiten und löschen
- Beträge mit einem klassischen Taschenrechnerfeld inklusive Klammern, Prozent und Punkt-vor-Strich eingeben
- Buchungen per Spracheingabe vorbereiten; Gruppen lassen sich ebenfalls per Sprache benennen und mit Monatsbudget anlegen
- Eigene Gruppen und Einnahme-/Ausgabekategorien erstellen und verwalten
- Monatsübersicht, Kategorienstatistik, Gruppenausgaben und filterbare Buchungsliste mit Suche
- Monatsbudgets für Gruppen und Kategorien sowie offene Beträge mit Teilrückzahlung verwalten
- Wiederkehrende Buchungen wöchentlich, monatlich oder jährlich planen
- Buchungen als CSV exportieren und alle App-Daten als JSON sichern oder wiederherstellen
- Brillenansicht mit Monatsübersicht, letzter Buchung, Gruppen und offenen Beträgen
- Spracheingabe wird unterstützt, wenn der Browser die Web Speech API bereitstellt

## Meta Wearables App-Zeichen

Saldo stellt für Meta Display Glasses ein Version-1-Manifest unter `/.well-known/meta-wearables-manifest.json` bereit. Es liefert den App-Namen und die cyanfarbene Darstellung. Das Icon ist ein transparentes, monochromes SVG für die 64 × 64 Icon-Fläche, wie in der [Meta Web Apps Icon-Dokumentation](https://wearables.developer.meta.com/docs/develop/webapps/build/app-icons/) beschrieben.

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

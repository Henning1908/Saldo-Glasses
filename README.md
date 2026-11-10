# Saldo — persönlicher Finanzassistent

Web-App für die Verwaltung selbst erfasster Einnahmen, Ausgaben, Budgets und privater Schulden. Die Brillenansicht ist für das 600 × 600 Meta Ray-Ban Display angelegt.

## Lokal starten

Die App besteht aus statischen HTML-, CSS- und JavaScript-Dateien im Ordner `site/`. Mit der [Cloudflare Pages CLI](https://developers.cloudflare.com/pages/get-started/direct-upload/) lässt sie sich lokal starten:

```sh
npx wrangler pages dev ./site
```

Alternativ kann der Ordner mit einem beliebigen lokalen Webserver geöffnet werden.

## Veröffentlichen

Das GitHub-Repository `Henning1908/Saldo-Glasses` bei Cloudflare Pages als Git-Projekt verbinden. Build-Befehl leer lassen und `site` als Build-Ausgabeordner eintragen. Danach veröffentlicht Cloudflare Pages jeden Push auf `main` automatisch. Alternativ lässt sich der Ordner `site/` direkt mit Wrangler Pages deployen.

## Auf der Meta Ray-Ban Display Glasses öffnen

Nach dem Deployment die HTTPS-Adresse in der Meta-AI-App unter den Einstellungen der Display-Brille bei **App connections → Add a Web App** hinzufügen. Für die Brillenansicht genügt HTML, CSS und JavaScript; diese App nutzt die Display-Web-Apps und keine native Begleit-App.

Die Vorschau über **Brillenansicht** ist am Desktop oder Handy bedienbar. Innerhalb der Vorschau wechseln Links-/Rechts-Pfeiltasten oder ein Tipp auf die jeweilige Displayhälfte zwischen Ergebnis, letzter Buchung, Schnellbuchungs-Hinweis und offenen Beträgen.

## Funktionen

- Einnahmen und Ausgaben mit Kategorie, Beschreibung und Datum erfassen
- Optionale Browser-Spracherkennung mit Bestätigung vor dem Speichern
- Monatswerte und Ergebnis automatisch aus Buchungen berechnen
- Eigene Budgetlimits einrichten und den Verbrauch verfolgen
- Schulden und verliehenes Geld samt Teilrückzahlungen verwalten
- Transaktionen filtern, durchsuchen, löschen und als CSV exportieren
- Persistenz im Browser über `localStorage`

## Datenmodell und Grenzen

Die aktuelle Version speichert Daten lokal im Browserprofil. Es gibt noch keine Benutzerkonten, zentrale Datenbank oder Synchronisierung zwischen Geräten. Keine Bankverknüpfung. Die Beispieldaten sind lokal und können über die App ergänzt oder gelöscht werden. Browser-Spracherkennung hängt vom Browser ab und wird nicht von allen Browsern angeboten.

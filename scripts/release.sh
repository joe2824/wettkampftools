#!/usr/bin/env bash
# Aufruf: ./scripts/release.sh [--dry-run] [--beta] [patch|minor|major|X.Y.Z|X.Y.Z-beta.N]
#
# Ohne Version: schlägt patch/minor/major vor (mit --beta: setzt eine offene Beta-Serie fort).
# --beta:       Vorabversion; kommt aus dem Branch dev, stabile Releases aus main.
# --dry-run:    zeigt nur, was passieren würde, und ändert nichts.
#
# Setzt die Version in package.json, tauri.conf.json, Cargo.toml und Cargo.lock,
# committet, taggt und pusht. Der Tag startet .github/workflows/release.yml.

set -euo pipefail

BETA=false
DRY_RUN=false
REQUEST=""
for arg in "$@"; do
	case "$arg" in
	--beta) BETA=true ;;
	--dry-run) DRY_RUN=true ;;
	-*)
		echo "Fehler: unbekannte Option $arg" >&2
		exit 1
		;;
	*)
		if [[ -n "$REQUEST" ]]; then
			echo "Fehler: nur eine Version angeben." >&2
			exit 1
		fi
		REQUEST="$arg"
		;;
	esac
done

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# Kanal schon vor der Rückfrage bekannt: der Branch wird zuerst geprüft.
if [[ "$REQUEST" == *-beta.* ]]; then
	BETA=true
fi
if [[ "$BETA" == true ]]; then
	EXPECTED_BRANCH="dev"
else
	EXPECTED_BRANCH="main"
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$BRANCH" != "$EXPECTED_BRANCH" ]]; then
	echo "Fehler: Releases dieses Kanals kommen aus '${EXPECTED_BRANCH}', aktuell ist '${BRANCH}' ausgecheckt." >&2
	exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
	echo "Fehler: Es gibt nicht committete Änderungen. Erst committen oder stashen." >&2
	git status --short >&2
	exit 1
fi

PLAN_ARGS=(plan)
if [[ "$BETA" == true ]]; then
	PLAN_ARGS+=(--beta)
fi
if [[ -n "$REQUEST" ]]; then
	PLAN_ARGS+=("$REQUEST")
fi
VERSION="$(node scripts/version.mjs "${PLAN_ARGS[@]}")"
TAG="v${VERSION}"

if [[ "$(node scripts/version.mjs branch "$VERSION")" != "$EXPECTED_BRANCH" ]]; then
	echo "Fehler: ${VERSION} passt nicht zum gewählten Kanal (--beta)." >&2
	exit 1
fi

# Dieselbe Regel wie im Release-Ablauf, nur früher: die Datei ersetzt die Notes.
if [[ -f RELEASE_NOTES.md ]] && [[ "$(head -n1 RELEASE_NOTES.md)" != *"$TAG"* ]]; then
	echo "Fehler: RELEASE_NOTES.md nennt in der ersten Zeile nicht ${TAG}. Anpassen oder löschen." >&2
	exit 1
fi

if [[ "$BETA" == true ]]; then
	CHANNEL="Beta (Vorabversion, nur NSIS-Installer)"
else
	CHANNEL="stabil"
fi
VERSION_FILES=(package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock)

if [[ "$DRY_RUN" == true ]]; then
	echo "Probelauf - es wird nichts geändert."
	echo "  Version: ${VERSION} (${CHANNEL})"
	echo "  Branch:  ${BRANCH}"
	echo "  Dateien:"
	node scripts/version.mjs apply --dry-run "$VERSION"
	echo "  Danach: Prüfungen (check, test, format:check, cargo test, cargo clippy),"
	echo "          Commit \"chore: release ${TAG}\", Tag ${TAG}, Push von ${BRANCH} und ${TAG}."
	exit 0
fi

echo "→ Prüfungen vor dem Release ..."
npm run check
npm test
npm run format:check
(cd src-tauri && cargo test && cargo clippy --all-targets -- -D warnings)

echo "→ Release ${TAG} (${CHANNEL})"
node scripts/version.mjs apply "$VERSION"

git add "${VERSION_FILES[@]}"
git commit -m "chore: release ${TAG}"
git tag -a "$TAG" -m "$TAG"
git push origin HEAD
git push origin "$TAG"

echo ""
echo "✓ ${TAG} getaggt - der Build läuft auf GitHub."
if [[ "$BETA" == true ]]; then
	echo "  Beta: als Vorabversion veröffentlicht. Wer „Beta-Versionen erhalten“ eingeschaltet hat, bekommt sie."
fi
echo "  https://github.com/joe2824/wettkampftools/actions"

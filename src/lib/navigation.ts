import type { Component } from "svelte";
import Award from "@lucide/svelte/icons/award";
import ClipboardList from "@lucide/svelte/icons/clipboard-list";
import LayoutTemplate from "@lucide/svelte/icons/layout-template";
import Ruler from "@lucide/svelte/icons/ruler";
import Settings from "@lucide/svelte/icons/settings";
import Trophy from "@lucide/svelte/icons/trophy";

export type NavigationItem = {
	label: string;
	href: string;
	icon: Component;
};

export type NavigationGroup = {
	label: string;
	items: readonly NavigationItem[];
};

export const NAVIGATION_GROUPS: readonly NavigationGroup[] = [
	{
		label: "Wellenwettkampf",
		items: [
			{ label: "Vorbereitung", href: "/preparation", icon: ClipboardList },
			{ label: "Auswertung", href: "/evaluation", icon: Trophy },
			{ label: "Urkunden", href: "/certificates", icon: Award }
		]
	},
	{
		label: "Werkzeuge",
		items: [
			{ label: "Entfernungen", href: "/distances", icon: Ruler },
			{ label: "Urkunden-Layout", href: "/certificates/layout", icon: LayoutTemplate }
		]
	}
];

export const FOOTER_ITEMS: readonly NavigationItem[] = [
	{ label: "Einstellungen", href: "/settings", icon: Settings }
];

function withoutTrailingSlash(path: string): string {
	return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

/** Nur exakte Treffer, damit Unterseiten ihre Elternseite nicht mitmarkieren. */
export function isActiveRoute(pathname: string, href: string): boolean {
	return withoutTrailingSlash(pathname) === withoutTrailingSlash(href);
}

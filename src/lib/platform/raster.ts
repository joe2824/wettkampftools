// SVG über die Zeichenfläche des Browsers in ein PNG umrechnen.
const SVG_TYPE = "image/svg+xml";
const PNG_TYPE = "image/png";

export async function svgToPng(svg: string, widthPx: number, heightPx: number): Promise<Uint8Array> {
	const url = URL.createObjectURL(new Blob([svg], { type: SVG_TYPE }));
	try {
		const image = new Image(widthPx, heightPx);
		image.src = url;
		await image.decode();
		const canvas = document.createElement("canvas");
		canvas.width = widthPx;
		canvas.height = heightPx;
		const context = canvas.getContext("2d");
		if (!context) throw new Error("Zeichenfläche nicht verfügbar");
		context.drawImage(image, 0, 0, widthPx, heightPx);
		const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, PNG_TYPE));
		if (!blob) throw new Error("PNG konnte nicht erzeugt werden");
		return new Uint8Array(await blob.arrayBuffer());
	} finally {
		URL.revokeObjectURL(url);
	}
}

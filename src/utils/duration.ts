export function calculateToastDuration(
	text: string,
	baseTime = 2000,
	wordsPerSecond = 3,
): number {
	const wordCount = text.split(/\s+/).length;
	const readingTime = (wordCount / wordsPerSecond) * 1000;
	return Math.max(baseTime, Math.min(readingTime, 10000)); // Mínimo baseTime, máximo 10 segundos
}

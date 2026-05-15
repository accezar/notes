export function formatDatePt(date: Date): string {
	return date.toLocaleDateString('pt-BR', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

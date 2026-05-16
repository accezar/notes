export interface HomeTimelinePost {
	id: string;
	title: string;
	description: string;
	href: string;
	thumbnail: string;
	searchText: string;
	readMin: number;
	visibleTopics: string[];
	authorLine: string;
	dateIso: string;
	dateFormatted: string;
}

import { RequestOptions } from 'http';
import { Duplex } from 'stream';

declare namespace download {
	interface IDownloadOptions extends RequestOptions {
		extract?: boolean;
		filename?: string;
		proxy?: string;
	}
}

declare function download(url: string, destination?: string, options?: download.IDownloadOptions): Promise<Buffer> & Duplex;

export = download;

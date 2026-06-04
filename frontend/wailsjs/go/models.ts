export namespace main {
	
	export class FileData {
	    name: string;
	    path: string;
	    base64: string;
	
	    static createFrom(source: any = {}) {
	        return new FileData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.path = source["path"];
	        this.base64 = source["base64"];
	    }
	}

}


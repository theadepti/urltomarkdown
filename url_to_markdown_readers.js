const apple_dev_parser = require('./url_to_markdown_apple_dev_docs.js');
const processor = require('./url_to_markdown_processor.js');
const filters = require('./url_to_markdown_common_filters.js');
const JSDOM = require('jsdom').JSDOM;
const https = require('https');

const failure_message  = "Sorry, could not fetch and convert that URL";

const apple_dev_prefix = "https://developer.apple.com";
const stackoverflow_prefix = "https://stackoverflow.com/questions";

function fetch_url (url, success) {
	https.get(url, (res) => {
	    let result = "";
	    res.on("data", (chunk) => {
	        result += chunk;
	    });
	    res.on("end", () => {
	    	success(result);
	    });
	});
}

class html_reader {
	read_url(url, res, options) {
		try {
			fetch_url(url, (html) => {				
				html = filters.strip_style_and_script_blocks(html);
				const document = new JSDOM(html);
				const id = "";
				let markdown = processor.process_dom(url, document, res, id, options);
				res.send(markdown);
			});
		} catch(error) {
			res.status(400).send(failure_message);
		}
	}
}

class apple_reader {
	read_url(url, res, options) {
		let json_url = apple_dev_parser.dev_doc_url(url);
		fetch_url.get(json_url, (body) => {	
            let json = JSON.parse(body);
            let markdown = apple_dev_parser.parse_dev_doc_json(json, options);
            res.send(markdown);
		});
	}
}

class stack_reader {
	read_url(url, res, options) {
		try {
			fetch_url(url, (html) => {
				html = filters.strip_style_and_script_blocks(html);
				const document = new JSDOM(html);	
				let markdown_q = processor.process_dom(url, document, res, 'question', options );
				options.inline_title = false;
				let markdown_a = processor.process_dom(url, document, res, 'answers', options );
				if (markdown_a.startsWith('Your Answer')) {
					res.send(markdown_q);
				}
				else {
					res.send(markdown_q + "\n\n## Answer\n"+ markdown_a);
				}
			});
		} catch(error) {
			res.status(400).send(failure_message);
		}
	}
}

module.exports = {
	html_reader,
	stack_reader,
	apple_reader,
	reader_for_url: function (url) {
		if (url.startsWith(apple_dev_prefix)) {
			return new apple_reader;
		} else if (url.startsWith(stackoverflow_prefix)) {		
			return new stack_reader;
		} else {
			return new html_reader;
		}
	},
	ignore_post: function(url) {
		if (url) {
			if (url.startsWith(stackoverflow_prefix)) {
				return true;
			}
		} else {
			return false;
		}
	}
}
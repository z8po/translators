{
	"translatorID": "a6ee60df-1ddc-4aae-bb25-45e0537be973",
	"label": "MARC",
	"creator": "Simon Kornblith, Sylvain Machefert, @z8po",
	"target": "marc",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 1,
	"lastUpdated": "2024-06-22 21:14:09"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Simon Kornblith, Sylvain Machefert

	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero. If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/

function detectImport() {
	var marcRecordRegexp = /^[0-9]{5}[a-z ]{3}$/;
	var read = Zotero.read(8);
	if (marcRecordRegexp.test(read)) {
		return true;
	}
	return false;
}
// test
var fieldTerminator = "\x1E";
var recordTerminator = "\x1D";
var subfieldDelimiter = "\x1F";

/*
 * CLEANING FUNCTIONS
 */


// general purpose cleaning
function clean(value) {
	if (value === undefined) {
		return null;
	}
	value = value.replace(/^[\s.,/:;]+/, '');
	value = value.replace(/[\s.,/:;]+$/, '');
	value = value.replace(/ +/g, ' ');

	var char1 = value.substr(0, 1);
	var char2 = value.substr(value.length - 1);
	if ((char1 == "[" && char2 == "]") || (char1 == "(" && char2 == ")")) {
		// chop of extraneous characters
		return value.substr(1, value.length - 2);
	}

	return value;
}

// number extraction
function pullNumber(text) {
	var pullRe = /[0-9]+/;
	var m = pullRe.exec(text);
	if (m) {
		return m[0];
	}
	return "";
}

// ISBN extraction
function pullISBN(text) {
	var pullRe = /[0-9X-]+/;
	var m = pullRe.exec(text);
	if (m) {
		return m[0];
	}
	return "";
}

// DOI extraction
function pullDOI(text) {
	var pullRe = /^10.\d{4,9}\/[-._;()/:A-Z0-9]+$/;
	var m = pullRe.exec(text);
	if (m) {
		return m[0];
	}
	return "";
}


function glueTogether(part1, part2, delimiter) {
	if (!part1 && !part2) {
		return null;
	}
	if (!part2) {
		return part1;
	}
	if (!part1) {
		return part2;
	}
	if (!delimiter) {
		return part1 + ' ' + part2;
	}
	// we only add the delimiter, if part1 is not ending with a punctation
	if (/[?:,.!;]\s*$/.test(part1)) {
		return part1 + ' ' + part2;
	}
	return part1 + delimiter + part2;
}

/*
  Extracted from zotero schema.json, i removed all itemtypes which cannot be determined from unimarc field analysis.
  GlobalTypes property is all the roles common to all itemTypes, just to avoid redundancy.
  Notabene, globaltype is searched only if an itemType has the same creatortype. For exemple, a film with a "Director" and no "author" filed
  will not try to find a relator in globalTypes author.
  But "Book" and "newsPaper" will search in globaltype schema author because they have a creatorType author themselves
*/

const schemaZoteroRelator = {
	globalTypes: [
	  {
		creatorType: "author",
		primary: true,
		relator: [
		  "062", // Author, attributed
		  "070", // author
		  "330", // pretended author dubious or incorrect author
		  "257", // continuator
		  "380", // counterfait
		  "560", // instigator
		],
	  },
	  {
		creatorType: "contributor",
		relator: [
		  "205", // contributor itsefl
		  "710", // secretary
		],
	  },
	  {
		creatorType: "translator",
		relator: [
		  "730", // translator
		  "735", // transliterator
		],
	  },
	  {
		creatorType: "editor",
		relator: [
		  "010", // adapter
		  "220", // compiler
		  "340", // editor as director of publication, selected text by
		  "190", // censor (removing is editing too)
		],
	  },
	  {
		creatorType: "seriesEditor",
		relator: [
		  "651", // publishing director
		  "475", // edited by collectivity
		],
	  },
	  {
		creatorType: "reviewedAuthor",
		relator: [
		  "072", // Author in quotations or text extracts
		],
	  },
	],
	itemTypes: [
	  {
		itemType: "artwork",
		creatorTypes: [
		  {
			creatorType: "artist",
			primary: true,
			relator: [
			  "040", //artist
			  "410", // graphic technician, colorist, computer design
			  "430", // illuminator
			  "440", // illustrator
			  "510", // lithographer
			  "600", // photographer
			  "740", // type designer
			  "750", // typographer
			  // 3d
			  "350", // engraver
			  "360", // etcher - hardwater
			  "530", // metal engraver
			  "705", // sculptor
			  "760", // wood engraver
			],
		  },
		  {
			creatorType: "contributor",
		  },
		],
	  },
	  {
		itemType: "audioRecording",
		creatorTypes: [
		  {
			creatorType: "performer",
			primary: true,
			relator: [
			  "005", // actor
			  "040", // artist
			  "207", // comedian or humorist
			  "303", // disk jockey
			  "545", // musician
			  "550", // narrator speaker
			  "590", // performer
			  "605", // Présentateur
			  "721", // singer
			  "755", // vocalist
			  "470", // interviewer
			  "605", // presenter
			],
		  },
		  {
			creatorType: "contributor",
			relator: [
			  "195", // choral director
			  "560", // Originator
			  "030", // arranger
			  "665", // producer (in sound industry it is a supervisor, an editor, not just a publisher)
			  "670", // sound engi
			  "672", // remixer
			  "460", // interviewee
			],
		  },
		  {
			creatorType: "composer",
			relator: [
			  "230", // composer
			  "233", // composer of adapted works
			  "236", // composer of main musical work
			  "770", // Writer of accompanying material
			],
		  },
		  {
			creatorType: "wordsBy",
			relator: [
			  "210", // commenter in audiovisual records
			  "212", // auteur du commentaire
			  "480", // librettist
			  "520", // lyricist
			],
		  },
		],
	  },
	  {
		itemType: "book",
		creatorTypes: [
		  // remember than book author will inherit from global roles
		  {
			creatorType: "author",
			primary: true,
			relator: [
			  "355", // Epitomator
			],
		  },
		  {
			creatorType: "contributor",
			relator: [
			  "075", // postfacer or colophon
			  "080", // prefacer
			  "205", // contributor
			  "212", // commenter for text
			  "290", // dedicator who write the dedication
			  "407", // glossator
			],
		  },
		  {
			creatorType: "editor",
		  },
		  {
			creatorType: "translator",
		  },
		  {
			creatorType: "seriesEditor",
		  },
		],
	  },
	  {
		itemType: "manuscript",
		creatorTypes: [
		  {
			creatorType: "author",
			primary: true,
			relator: [
			  "450", // letter sender
			],
		  },
		  {
			creatorType: "contributor",
			relator: [
			  "020", // manuscript annotator
			  "270", // corrector manuscript
			  "700", // copist
			],
		  },
		  {
			creatorType: "translator",
		  },
		],
	  },
	  {
		itemType: "computerProgram",
		creatorTypes: [
		  {
			creatorType: "programmer",
			primary: true,
			relator: [
			  "635", // programmer
			  "405", // game designer
			],
		  },
		  {
			creatorType: "contributor",
		  },
		],
	  },
	  {
		itemType: "film",
		creatorTypes: [
		  {
			creatorType: "director",
			primary: true,
			relator: [
			  "300", // director, author's name for film maker
			],
		  },
		  {
			creatorType: "contributor",
			relator: [
			  "005", // actor
			  "018", // animation
			  "030", // arranger
			  "195", // choral chief
			  "200", // choregrapher
			  "202", // circus artist
			  "207", // humorist
			  "210", // commenter
			  "230", // composer
			  "233", // composer of adapted
			  "236", // composer of main
			  "275", // danser
			  "370", // film editor as post-prod
			  "520", // lyrics
			  "535", // mime
			  "545", // musician
			  "550", // narator
			  "590", // interpretor
			  "605", // presenter
			  "630", // artistic director
			  "633", // member of prod team, tech team
			  "655", // puppeteer
			  "670", // sound engi
			  "695", // scientific counseler
			  "721", // singer
			  "726", // stunt
			  "470", // interviewer
			  "460", // interviewee
			  "605", // presenter
			],
		  },
		  {
			creatorType: "scriptwriter",
			relator: [
			  "090", // author of dialog
			  "690", // scenarist
			],
		  },
		  {
			creatorType: "producer",
			relator: [
			  "630", // producer
			],
		  },
		],
	  },
	  {
		itemType: "magazineArticle",
		creatorTypes: [
		  {
			creatorType: "author",
			primary: true,
		  },
		  {
			creatorType: "contributor",
		  },
		  {
			creatorType: "translator",
		  },
		  {
			creatorType: "reviewedAuthor",
		  },
		],
	  },
	  {
		itemType: "journalArticle",
		creatorTypes: [
		  {
			creatorType: "author",
			primary: true,
		  },
		  {
			creatorType: "contributor",
		  },
		  {
			creatorType: "editor",
		  },
		  {
			creatorType: "translator",
		  },
		  {
			creatorType: "reviewedAuthor",
		  },
		],
	  },
	  {
		itemType: "map",
		creatorTypes: [
		  {
			creatorType: "cartographer",
			primary: true,
			relator: [
			  "180", // cartographer
			  "040", // artist
			  "440", // Illustrator
			],
		  },
		  {
			creatorType: "contributor",
			relator: [
			  "410", // graphic technician, colorist, computer design
			],
		  },
		  {
			creatorType: "seriesEditor",
		  },
		],
	  },
	  {
		itemType: "newspaperArticle",
		creatorTypes: [
		  {
			creatorType: "author",
			primary: true,
		  },
		  {
			creatorType: "contributor",
		  },
		  {
			creatorType: "translator",
		  },
		  {
			creatorType: "reviewedAuthor",
		  },
		],
	  },
	  {
		itemType: "patent",
		creatorTypes: [
		  {
			creatorType: "inventor",
			primary: true,
			relator: [
			  "245", // conceptor inventor, from the original idea of
			  "582", // Patent applicant is not the
			  "584", // Patent Inventor
			],
		  },
		  {
			creatorType: "attorneyAgent",
			relator: [
			  "552", // notary
			  "540", // monitor An agent that supervises the compliance with the contract and is responsible for the report and controls its distribution. Sometimes referred to as the grantee, or controlling agency.
			],
		  },
		  {
			creatorType: "contributor",
		  },
		],
	  },
	  {
		itemType: "preprint",
		creatorTypes: [
		  {
			creatorType: "author",
			primary: true,
			relator: [
			  "305", // candidate, for thesis
			  "677", // Research team member
			  "673", // Research team head
			  "595", // Performer of research
			],
		  },
		  {
			creatorType: "contributor",
			relator: [
			  "003", // academic
			  "727", // thesis advisor
			  "695", // scientific advisor
			],
		  },
		  {
			creatorType: "editor",
		  },
		  {
			creatorType: "translator",
		  },
		  {
			creatorType: "reviewedAuthor",
		  },
		],
	  },
	  {
		itemType: "report",
		creatorTypes: [
		  {
			creatorType: "author",
			primary: true,
		  },
		  {
			creatorType: "contributor",
		  },
		  {
			creatorType: "translator",
		  },
		  {
			creatorType: "seriesEditor",
		  },
		],
	  },

	  {
		itemType: "thesis",
		creatorTypes: [
		  {
			creatorType: "author",
			primary: true,
			relator: [
			  "305", // candidate, for thesis
			  "677", // Research team member
			  "673", // Research team head
			  "595", // Performer of research
			],
		  },
		  {
			creatorType: "contributor",
			relator: [
			  "003", // academic
			  "727", // thesis advisor
			  "695", // scientific advisor
			],
		  },
		],
	  },
	  {
		itemType: "document",
		creatorTypes: [
			{
				"creatorType": "author",
				"primary": true
			},
			{
				"creatorType": "contributor"
			},
			{
				"creatorType": "editor"
			},
			{
				"creatorType": "translator"
			},
			{
				"creatorType": "reviewedAuthor"
			}
		]
	  },
	],
  }

/**
 * @name getCreatorType
 * @param {object} item item used with item.Type "film" "audioRecording" "map" "artwork" "manuscript" "book" "thesis"  "bookSection" "journalArticle" "conferencePaper" "computerProgram" ...
 * @param {string} relator extracted optionnal relator code in the sub-field $4 of the bibliographical responsability block 7XX
 * @description  Map MARC responsability block relator code to the to Zotero creator types of an item type. Mapping done with following documentation:
 * Relator codes $4 subfield values: https://www.ifla.org/wp-content/uploads/2019/05/assets/uca/unimarc_updates/BIBLIOGRAPHIC/u_b_appb_update2020_online_final.pdf .
 * Relator codes $4 subfield values, french version from A.B.E.S.: https://documentation.abes.fr/sudoc/formats/unmb/DonneesCodees/CodesFonctions.htm#NUM212
 * Zotero creator types: see https://github.com/zotero/zotero-schema/blob/master/schema.json which is a json-schema describing structure for validating inter alia possible author type values.
 * Mapping zotero creator type to item type: see https://www.zotero.org/support/kb/item_types_and_fields
 * Relator subfield is optionnal and it fallbacks to creator type "author" for 7X0-7X1 and "contributor" for 7X2
 * @returns {object} creatorType name used in zotero schema
 */

function getCreatorType(item, relator) {

	// fallback to default creator type "author" if responsability block is 7X0-7X1 and "contributor" for 7X2
	// set as default the primary zotero creator type for 7X1 and contributor for 7X2 which is common for all items type.

	const creatorsForType = Zotero.Utilities.getCreatorsForType(item.itemType)

	return [
		... schemaZoteroRelator.itemTypes.find(({itemType}) => itemType === item.itemType)?.creatorTypes,
		... schemaZoteroRelator.globalTypes
	].find(type =>
		// search for relator in creator type in globaltypes
		creatorsForType?.includes(type.creatorType) && type?.relator?.includes(relator)
	)?.creatorType
}

/*
 * END CLEANING FUNCTIONS
 */

var record = function () {
	this.directory = {};
	this.leader = "";
	this.content = "";

	// defaults
	this.indicatorLength = 2;
	this.subfieldCodeLength = 2;
};

// import a binary MARC record into this record
record.prototype.importBinary = function (record) {
	// get directory and leader
	var directory = record.substr(0, record.indexOf(fieldTerminator));
	this.leader = directory.substr(0, 24);
	directory = directory.substr(24);

	// get various data
	this.indicatorLength = parseInt(this.leader.substr(10, 1));
	this.subfieldCodeLength = parseInt(this.leader.substr(11, 1));
	var baseAddress = parseInt(this.leader.substr(12, 5));

	// get record data
	var contentTmp = record.substr(baseAddress);

	// MARC wants one-byte characters, so when we have multi-byte UTF-8
	// sequences, add null characters so that the directory shows up right. we
	// can strip the nulls later.
	this.content = "";
	for (i = 0; i < contentTmp.length; i++) {
		this.content += contentTmp.substr(i, 1);
		if (contentTmp.charCodeAt(i) > 0x00FFFF) {
			this.content += "\x00\x00\x00";
		}
		else if (contentTmp.charCodeAt(i) > 0x0007FF) {
			this.content += "\x00\x00";
		}
		else if (contentTmp.charCodeAt(i) > 0x00007F) {
			this.content += "\x00";
		}
	}

	// read directory
	for (var i = 0; i < directory.length; i += 12) {
		var tag = parseInt(directory.substr(i, 3));
		var fieldLength = parseInt(directory.substr(i + 3, 4));
		var fieldPosition = parseInt(directory.substr(i + 7, 5));

		if (!this.directory[tag]) {
			this.directory[tag] = [];
		}
		this.directory[tag].push([fieldPosition, fieldLength]);
	}
};

// add a field to this record
record.prototype.addField = function (field, indicator, value) {
	field = parseInt(field);
	// make sure indicator is the right length
	if (indicator.length > this.indicatorLength) {
		indicator = indicator.substr(0, this.indicatorLength);
	}
	else if (indicator.length != this.indicatorLength) {
		indicator = Zotero.Utilities.lpad(indicator, " ", this.indicatorLength);
	}

	// add terminator
	value = indicator + value + fieldTerminator;

	// add field to directory
	if (!this.directory[field]) {
		this.directory[field] = [];
	}
	this.directory[field].push([this.content.length, value.length]);

	// add field to record
	this.content += value;
};

// get all fields with a certain field number
record.prototype.getField = function (field) {
	field = parseInt(field);
	var fields = [];

	// make sure fields exist
	if (!this.directory[field]) {
		return fields;
	}

	// get fields
	for (var i in this.directory[field]) {
		var location = this.directory[field][i];

		// add to array, replacing null characters
		fields.push([this.content.substr(location[0], this.indicatorLength),
			this.content.substr(location[0] + this.indicatorLength,
				location[1] - this.indicatorLength - 1).replace(/\x00/g, "")]);
	}

	return fields;
};

// given a field string, split it into subfields
record.prototype.extractSubfields = function (fieldStr, tag /* for error message only*/) {
	if (!tag) tag = '<no tag>';

	var returnSubfields = {};

	var subfields = fieldStr.split(subfieldDelimiter);
	if (subfields.length == 1) {
		returnSubfields["?"] = fieldStr;
	}
	else {
		for (var j in subfields) {
			if (subfields[j]) {
				var subfieldIndex = subfields[j].substr(0, this.subfieldCodeLength - 1);
				if (!returnSubfields[subfieldIndex]) {
					returnSubfields[subfieldIndex] = subfields[j].substr(this.subfieldCodeLength - 1);
				}
				else {
					// Duplicate subfield
					Zotero.debug("Duplicate subfield '" + tag + " " + subfieldIndex + "=" + subfields[j]);
					returnSubfields[subfieldIndex] = returnSubfields[subfieldIndex] + " " + subfields[j].substr(this.subfieldCodeLength - 1);
				}
			}
		}
	}

	return returnSubfields;
};

// get subfields from a field
record.prototype.getFieldSubfields = function (tag) { // returns a two-dimensional array of values
	var fields = this.getField(tag);
	var returnFields = [];

	for (var i = 0, n = fields.length; i < n; i++) {
		returnFields[i] = this.extractSubfields(fields[i][1], tag);
	}

	return returnFields;
};

// add field to DB
record.prototype._associateDBField = function (item, fieldNo, part, fieldName, execMe, arg1, arg2) {
	var field = this.getFieldSubfields(fieldNo);

	Zotero.debug('MARC: found ' + field.length + ' matches for ' + fieldNo + part);
	if (field) {
		for (var i in field) {
			var value = false;
			for (var j = 0; j < part.length; j++) {
				var myPart = part.substr(j, 1);
				if (field[i][myPart]) {
					if (value) {
						value += " " + field[i][myPart];
					}
					else {
						value = field[i][myPart];
					}
				}
			}
			if (value) {
				value = clean(value);

				if (execMe) {
					value = execMe(value, arg1, arg2);
				}

				if (fieldName == "creator") {
					item.creators.push(value);
				}
				else if (fieldName == "ISBN") {
					if (!item[fieldName]) {
						item[fieldName] = value;
					}
					else {
						item[fieldName] += ' ' + value;
					}
				}
				else {
					item[fieldName] = value;
					return;
				}
			}
		}
	}
};

// add field to DB as note
record.prototype._associateNotes = function (item, fieldNo, part) {
	var field = this.getFieldSubfields(fieldNo);
	var texts = [];

	for (var i in field) {
		for (var j = 0; j < part.length; j++) {
			var myPart = part.substr(j, 1);
			if (field[i][myPart]) {
				texts.push(clean(field[i][myPart]));
			}
		}
	}
	var text = texts.join(' ');
	if (text.trim() != "") item.notes.push({ note: text });
};

// add field to DB as tags
record.prototype._associateTags = function (item, fieldNo, part) {
	var field = this.getFieldSubfields(fieldNo);

	for (var i in field) {
		for (var j = 0; j < part.length; j++) {
			var myPart = part.substr(j, 1);
			if (field[i][myPart]) {
				item.tags.push(clean(field[i][myPart]));
			}
		}
	}
};

// this function loads a MARC record into our database
record.prototype.translate = function (item) {
	// get item type based on header
	// for detail https://www.transition-bibliographique.fr/wp-content/uploads/2018/07/Bsection5-Label_notice-6-2010.pdf
	if (this.leader) {
		var marcType = this.leader.substr(6, 1);
		if (marcType === "a") {
			item.itemType = "book";
		// Film isnt really perfect since all video media arent a film,
		// Zotero has "tv broadcast" and "video recording"
		// but "video recording" isnt a vanilla item, it is a fallback for everything which isnt "tv" or "film"
		// whereas there isnt "music" but "audio recording" as common denominator for audio content, including artistic content
		} else if (marcType === "g") {
			item.itemType = "film";
		} else if (marcType === "j" || marcType === "i") {
			item.itemType = "audioRecording";
		} else if (marcType === "e" || marcType === "f") {
			item.itemType = "map";
		} else if (marcType === "k" || marcType === "r") {
			// 2d draw or 3d sculpt artwork
			item.itemType = "artwork";
		} else if (marcType === "t" || marcType === "b") {
			// 20091210: in unimarc, the code for manuscript is b, unused in marc21.
			item.itemType = "manuscript";
		} else if (marcType === "l") {
			item.itemType = "computerProgram";
		// multimedia is a combination of all other types, need a disambiguation,
		// film or computer program could be the more descriptive,
		// we could choose "film" because there is a lot of relator <-> creatortype possible bindings
		// We could use "document" since it is the zotero vanilla fallback
		} else if (marcType === "m") {
			item.itemType = "film";
		}
	}
	/*
	REVIEW
	 if itemType not found the legacy fallback in previous code was "film", not sure it is the cleviest choice.
	 I do an asumption, it comes from wrongly setted records without is mostly film but need to be acknowledged in review.
	 I would personnaly think in UNIMARC the hightest probability would be "book" for successfull blind detection.
	 Another point of view, "document" is the basic vanilla itemType in zotero dev documentation so could be a better fallback
	*/

	item.itemType ||= "document"

	// Starting from there, we try to distinguish between unimarc and other marc flavours.
	// In unimarc, the title is in the 200 field and this field isn't used in marc-21 (at least)
	// In marc-21, the title is in the 245 field and this field isn't used in unimarc
	// So if we have a 200 and no 245, we can think we are with an unimarc record.
	// Otherwise, we use the original association.

	if ((this.getFieldSubfields("200")[0]) && (!(this.getFieldSubfields("245")[0]))) {

		// We try to distinguish itemtype based on disposable fields
		// https://www.transition-bibliographique.fr/unimarc/manuel-unimarc-format-bibliographique/
		// because to do a proper correlation between:
		//  - in the first hand zotero roles described in his itemType schemas,
		//  - in the other hand unimarc relators,
		// the better is to target as precisely as possible zotero itemType.
		// Here we used all field which can give clues and help

		// Report detection
		// 013 – ISMN (International Standard Music Number), for **printed** music, lyrics, Musical score
		if (this.getFieldSubfields("013")[0]) {
			item.itemType = "report"
		}

		// magazineArticle newspaperArticle detection
		// has 011 - ISSN and no 010 - ISBN
		// it is a published press who need disambiguation betweeen "newspapper" and "magazine"

		/*
		REVIEW:
		Not sure if all magazine have a subfield 014 periodical well setted, so detection could fail.
		And newspapper could have one 014 too (for exemple french daily national newspapper LeMonde has an id in the mainpage between date and price).
		But i dont know what is the behavior when registering both type of press as UNIMARC records. Need to be tested / acknowledged.
		From zotero point of view alone, magazine has a periodical id and newspaper doesnt.
		*/
		if (this.getFieldSubfields("011")[0] &&
		!this.getFieldSubfields("010")[0]
		) {
			// has 014 – periodical ID
			if (this.getFieldSubfields("014")[0]) {
				item.itemType = "magazineArticle"
			} else {
				item.itemType = "newspaperArticle"
			}
		}

		// book detection (fallback)
		// 017 – legacy SBN (id which existed before ISBN)
		if (this.getFieldSubfields("017")[0]) {
			item.itemType = "book"
		}

		/*
		 REVIEW attentively the following block, not error proof or maybe improvable.
		 DOI detection: There is subfields usable described in associated IFLA compliance to find DOI
		 033 – Identifiant pérenne dans d’autres systèmes
		 035 – Identifiant de la notice dans un autre système
		 856 - remote ressource
		 In 033 and 035 by pure logic, uses wouldnt put DOI here but it is still possible.
		 856$u is possible for remote url, but could not be a DOI just the directly resolved url
		 Notabene DOI is present field in zotero for item : "journal article", "preprint", "conferencePaper", "dataset".

		 We do detection based on Zotero rules:
		 -> "conferencePaper" can have an ISBN but no ISSN
		 -> "journalArticle" can have an ISSN but no ISBN
		 -> "preprint" has not ISSN and no ISBN

		 this part make me doubt, maybe it would be better to put everything with a DOI as a fallback in "journalArticle"
		*/

		const DOI = [
			['033', 'a'],
			['035', 'a'],
			['856', 'u']
		].map(([field, subfield]) => [field, subfield, this.getFieldSubfields(field)])
		.find(([field, subfield, items]) =>
			// try to find on the fly the first doi recorded in one of the field
			items.find(item =>
				pullDOI(item[subfield])
			)
		)
		// detection and disctinction between "conference paper", "journal article", "preprint"
		if (DOI) {
			this._associateDBField(item, DOI[0], DOI[1], "DOI", pullDOI);
			// if has a ISBN according to zotero should be a "conference Paper"
			if (this.getFieldSubfields("010")[0] ) {
				item.itemType = "conferencePaper"
			// if has a ISSN according to zotero should be a "journal Article"
			} else if (!this.getFieldSubfields("011")[0]) {
				item.itemType = "journalArticle"
			// no issn, no isbn it is preprint
			} else {
				item.itemType = "preprint"
			}
		}

		// Report detection
		// 015 – ISRN (International Standard Technical Report Number)
		// 022 - official, country based
		if (this.getFieldSubfields("015")[0]) {
			item.itemType = "report"
		}

		// audio recording detection
		// 016 – ISRC (International Standard Recording Code)
		// put it after 013 ISMN to avoid bad typing "audio recording" in "report" if they have both id,
		if (this.getFieldSubfields("016")[0]
		) {
			// could be both video and audio it is just a fallback if no marktype presetted
			item.itemType ||= "audioRecording"
		}

		// Thesis detection

		/*
		REVIEW
		 imho legacy setted 328 is maybe not the best field because it includes "or another academic work"
		 whereas 029 is a id of thesis itself, maybe best approach here
		 but zotero doc indicate than "thesis" could be simply student work for applying a degree, published or **unpublished**
		 so 029 could be optionnal approach too
		*/

		// thesis note or thesis number
		if (this.getFieldSubfields("328")[0] || this.getFieldSubfields("029")[0]) {
			item.itemType = "thesis";
		}

		/*
			TODO FEATURE

			for zotero itemType "bill", "patent", "case", "standard", "statute"
			we could do the same as it was done with DOI detection in UNIMARC "other ID field"
			by finding corresponding id regexp from wikidata ids property page.
			for exemple a sparql query to find all regexp of all id which is subclass of "juridic" ID
			This could be error proof if some ids have a real specific pattern.
			This reasoning could be applied for all itemType which is specific enougth to have a id reflecting a speciality.

			Take a look to REVIEW line :1058 about administrative content, some
		*/

		// Extract ISBNs
		this._associateDBField(item, "010", "a", "ISBN", pullISBN);
		// Extract ISSNs
		this._associateDBField(item, "011", "a", "ISSN", pullISBN);

		const fields = [
			700, // main responsability
			701, // another main responsability
			702, // secondary responsability
			710, // main collective responsability
			711, // another main collective responsability
			712  // secondary collective responsability
		].map(authorCode => {
			return this.getFieldSubfields(authorCode)
				/*
				REVIEW not sure filtering authors without relator subfield is the best thing to do since relator subfield is optionnal record.
				-> Maybe using a fallback author 7X1 // contributor 7X2 if no $4 found AND the record is unique is a better approach than skipping an authorfield,
				since lot of zotero translators are inherited from MARC.js and all endpoint may not have a homogeneous disciplinarity on records curation
				*/
				.filter(subfield => subfield['4'])
		}).flat()

		// Middleware used to precise itemType based on subfield 7XX$4 role
		// Other itemType detection based on role goes here
		fields.forEach((subfield) => {

			/*
			REVIEW ifaik WIPO Standard ST.25 is used for patent and there is associated zotero translators for that,
			with dedicated endpoints WIPO, not unimarc.
			But maybe unimarc can be (or is) used for patent searches. I asked an AI about who use UNIMARC, and it **seems**
			administrations can (or allready) use it for archiving letters, reports, employee and citizen files, administatives acts.

			Same, i searched a bit on Zotero translator which one inject the itemType "case" (court) and "statute" (law),
			but i didnt found one inheriting from MARC.js, the translators for those administrative itemTypes usualy fetch a dedicated API / website,
			some kind of opendata gov access.

			Maybe thoses UNIMARC endpoints, if they exist, are not public, the protocol is used but the endpoint is private.
			I'm not specialized in archivism, i mostly know for librarian and academic uses, i'll need to ask someone, and take a deepest search in
			zotero translators to see if there is other uses of UNIMARC.
			Then searching a bit online if administrations have a dedicated unimarc endpoint which can be used. AI tells me Europe admin
			used it but i dont know if it hallucinates, and it wasnt clean between *could* or *is*

			This isnt a priority, just if MARC.js has to be inherited for various uses, it should try to detect and manage all the itemtypes.
			For patent it is quite clear because of the proprer patent relator role.

			Notabene, while classing all relator subfields, i found "notary" which can be used for administrative contents.
			should try a request to find all document with notary $4 field to take a look where it is used
			*/

			// patent detection
			// if one of the authors is 582 Patent applicant 584 Patent inventor 587 Patentee itemtype is a patent
			if ([
				'582', // patent applicant
				'584', // Patent inventor
				'587' // patentee
				].includes(subfield?.['4'])
			) {
				item.itemType = "patent"
			}
			// thesis detection
			if ([
				'305', // thesis candidate
			].includes(subfield?.['4'])) {
				item.itemType = "thesis"
			}
		})

		fields.map((subfield) => {
			const creatorType = getCreatorType(item,  subfield['4'])
			const creator =  subfield.a && creatorType && (
				subfield.b ?
					// for 701
					Zotero.Utilities.cleanAuthor(`${subfield.a.replace(/,\s*$/, '')}, ${subfield.b}`, creatorType, true) :
					// used for both 71X organisation with single name and 70X author without firstname 
					// fieldMode:1 is a flag for directly using lastname in post processing
					{
						lastName: subfield.a,
						creatorType: creatorType,
						fieldMode: 1
					}
			)
			return creator
		})
		// remove creator with uncorresponding zotero creator type
		.filter(Boolean)
		// Insert all of found creator with corresponding zotero creator type
		.forEach(creator => {
			item.creators.push(creator);
		})

		// Extract language. In the 101$a there's a 3 chars code, would be better to
		// have a translation somewhere
		this._associateDBField(item, "101", "a", "language");

		// Extract abstractNote
		this._associateDBField(item, "328", "a", "abstractNote");
		this._associateDBField(item, "330", "a", "abstractNote");

		// Extract tags
		// TODO : Ajouter les autres champs en 6xx avec les autorités construites.
		// nécessite de reconstruire les autorités
		this._associateTags(item, "610", "a");

		// Extract scale (for maps)
		this._associateDBField(item, "206", "a", "scale");

		// Extract title
		var title = this.getField("200")[0][1]	// non-repeatable
						.replace(	// chop off any translations, since they may have repeated $e fields
							new RegExp('\\' + subfieldDelimiter + 'd.+'), '');
		title = this.extractSubfields(title, '200');
		item.title = glueTogether(clean(title.a), clean(title.e), ': ');

		// Extract edition
		this._associateDBField(item, "205", "a", "edition");


		// Field 214 replaces 210 in newer version of UNIMARC; the two are exclusive
		// 214 uses numbered subfields to describe different types of bibliographic information
		// currently not using that
		// see https://www.transition-bibliographique.fr/wp-content/uploads/2019/08/B214-2019.pdf
		if (this.getField("214").length) {
			this._associateDBField(item, "214", "a", "place");
			if (item.itemType == "film") {
				this._associateDBField(item, "214", "c", "distributor");
			}
			else {
				this._associateDBField(item, "214", "c", "publisher");
			}
			// Extract year
			this._associateDBField(item, "214", "d", "date", pullNumber);
		}
		else {
			// Extract place info
			this._associateDBField(item, "210", "a", "place");

			// Extract publisher/distributor
			if (item.itemType == "film") {
				this._associateDBField(item, "210", "c", "distributor");
			}
			else {
				this._associateDBField(item, "210", "c", "publisher");
			}
			// Extract year
			this._associateDBField(item, "210", "d", "date", pullNumber);
		}


		// Extract pages. Not working well because 215$a often contains pages + volume informations : 1 vol ()
		// this._associateDBField(item, "215", "a", "pages", pullNumber);

		// Extract series
		this._associateDBField(item, "225", "a", "series");
		// Extract series number
		this._associateDBField(item, "225", "v", "seriesNumber");

		// Extract call number
		this._associateDBField(item, "686", "ab", "callNumber");
		this._associateDBField(item, "676", "a", "callNumber");
		this._associateDBField(item, "675", "a", "callNumber");
		this._associateDBField(item, "680", "ab", "callNumber");

		this._associateDBField(item, "856", "u", "url");
	}
	// other MARC flavor
	else {
		// If we've got a 502 field, we're on a thesis, either published on its own (thesis)
		// or by a publisher and therefore with an ISBN number (book).
		if (this.getFieldSubfields("502")[0] && !this.getFieldSubfields("020")[0]) {
			item.itemType = "thesis";
		}

		// Extract ISBNs
		this._associateDBField(item, "020", "a", "ISBN", pullISBN);
		// Extract ISSNs
		this._associateDBField(item, "022", "a", "ISSN", pullISBN);
		// Extract language
		this._associateDBField(item, "041", "a", "language");
		// Extract creators
		// http://www.loc.gov/marc/relators/relaterm.html
		var RELATERM = {
			act: "castMember",
			asn: "contributor", // Associated name
			aut: "author",
			cmp: "composer",
			ctb: "contributor",
			drt: "director",
			edt: "editor",
			pbl: "SKIP", // publisher
			prf: "performer",
			pro: "producer",
			pub: "SKIP", // publication place
			trl: "translator"
		};

		var creatorFields = ["100", "110", "700", "710"];// "111", "711" are meeting name
		for (let i = 0; i < creatorFields.length; i++) {
			var authorTab = this.getFieldSubfields(creatorFields[i]);
			for (let j in authorTab) {
				if (authorTab[j]['4'] && RELATERM[authorTab[j]['4']] && RELATERM[authorTab[j]['4']] == "SKIP") {
					continue;
				}
				var creatorObject = {};
				if (authorTab[j].a) {
					if (creatorFields[i] == "100" || creatorFields[i] == "700") {
						creatorObject = ZU.cleanAuthor(authorTab[j].a, "author", true);
					}
					else {
						// same replacements as in the function ZU.cleanAuthor for institutional authors:
						authorTab[j].a = authorTab[j].a.replace(/^[\s\u00A0.,/[\]:]+/, '')
							.replace(/[\s\u00A0.,/[\]:]+$/, '')
							.replace(/[\s\u00A0]+/, ' ');
						creatorObject = { lastName: authorTab[j].a, creatorType: "contributor", fieldMode: 1 };
					}
					// some heuristic for the default values:
					// in a book without any person as a main entry (no 100 field)
					// it is likely that all persons (in 700 fields) are editors
					if (creatorFields[i] == "700" && !this.getFieldSubfields("100")[0] && item.itemType == "book") {
						creatorObject.creatorType = "editor";
					}
					if (authorTab[j]['4'] && RELATERM[authorTab[j]['4']]) {
						creatorObject.creatorType = RELATERM[authorTab[j]['4']];
					}
					item.creators.push(creatorObject);
				}
			}
		}

		this._associateDBField(item, "111", "a", "meetingName");
		this._associateDBField(item, "711", "a", "meetingName");

		if (item.itemType == "book" && !item.creators.length) {
			// some LOC entries have no listed author, but have the author in the person subject field as the first entry
			var field = this.getFieldSubfields("600");
			if (field[0]) {
				item.creators.push(Zotero.Utilities.cleanAuthor(field[0].a, "author", true));
			}
		}

		// Extract tags
		// personal
		this._associateTags(item, "600", "aqtxyzv");
		// corporate
		this._associateTags(item, "610", "abxyzv");
		// meeting
		this._associateTags(item, "611", "abtxyzv");
		// uniform title
		this._associateTags(item, "630", "acetxyzv");
		// chronological
		this._associateTags(item, "648", "atxyzv");
		// topical
		this._associateTags(item, "650", "axyzv");
		// geographic
		this._associateTags(item, "651", "abcxyzv");
		// uncontrolled
		this._associateTags(item, "653", "axyzv");
		// faceted topical term (whatever that means)
		this._associateTags(item, "654", "abcyzv");
		// genre/form
		this._associateTags(item, "655", "abcxyzv");
		// occupation
		this._associateTags(item, "656", "axyzv");
		// function
		this._associateTags(item, "657", "axyzv");
		// curriculum objective
		this._associateTags(item, "658", "ab");
		// hierarchical geographic place name
		this._associateTags(item, "662", "abcdfgh");

		// Extract note fields
		// http://www.loc.gov/marc/bibliographic/bd5xx.html
		// general note
		this._associateNotes(item, "500", "a");
		// dissertation note
		this._associateNotes(item, "502", "a");
		// formatted contents (table of contents)
		this._associateNotes(item, "505", "art");
		// summary
		// Store as abstract if not already available and only one such note exists
		if (!item.abstractNote && this.getField("520").length == 1) {
			this._associateDBField(item, "520", "ab", "abstractNote");
		}
		else {
			this._associateNotes(item, "520", "ab");
		}
		// biographical or historical data
		this._associateNotes(item, "545", "ab");

		// Extract title
		//  a = main title
		//  b = subtitle
		//  n = Number of part/section of a work
		//  p = Name of part/section of a work
		var titlesubfields = this.getFieldSubfields("245")[0];
		item.title = glueTogether(
			glueTogether(clean(titlesubfields.a), clean(titlesubfields.b), ": "),
			glueTogether(clean(titlesubfields.n), clean(titlesubfields.p), ": "),
			". "
		);

		// Extract edition
		this._associateDBField(item, "250", "a", "edition");
		// Extract place info
		this._associateDBField(item, "260", "a", "place");

		// Extract publisher/distributor
		if (item.itemType == "film") {
			this._associateDBField(item, "260", "b", "distributor");
		}
		else {
			this._associateDBField(item, "260", "b", "publisher");
		}

		// Extract year
		this._associateDBField(item, "260", "c", "date", pullNumber);
		// Extract pages
		this._associateDBField(item, "300", "a", "numPages", pullNumber);
		// Extract series and series number
		// The current preference is 490
		this._associateDBField(item, "490", "a", "series");
		this._associateDBField(item, "490", "v", "seriesNumber");
		// 440 was made obsolete as of 2008; see http://www.loc.gov/marc/bibliographic/bd4xx.html
		this._associateDBField(item, "440", "a", "series");
		this._associateDBField(item, "440", "v", "seriesNumber");
		// Extract call number
		this._associateDBField(item, "084", "ab", "callNumber");
		this._associateDBField(item, "082", "a", "callNumber");
		this._associateDBField(item, "080", "ab", "callNumber");
		this._associateDBField(item, "070", "ab", "callNumber");
		this._associateDBField(item, "060", "ab", "callNumber");
		this._associateDBField(item, "050", "ab", "callNumber");
		this._associateDBField(item, "090", "ab", "callNumber");
		this._associateDBField(item, "099", "a", "callNumber");
		this._associateDBField(item, "852", "khim", "callNumber");
		// OCLC numbers are useful info to save in extra
		var controlNumber = this.getFieldSubfields("035")[0];
		if (controlNumber && controlNumber.a && controlNumber.a.indexOf("(OCoLC)") == 0) {
			item.extra = "OCLC: " + controlNumber.a.substring(7);
		}
		// Extract URL for electronic resources
		this._associateDBField(item, "245", "h", "medium");
		if (item.medium == "electronic resource" || item.medium == "Elektronische Ressource") this._associateDBField(item, "856", "u", "url");

		// Field 264 instead of 260
		if (!item.place) this._associateDBField(item, "264", "a", "place");
		if (!item.publisher) this._associateDBField(item, "264", "b", "publisher");
		if (!item.date) this._associateDBField(item, "264", "c", "date", pullNumber);

		// German
		if (!item.place) this._associateDBField(item, "410", "a", "place");
		if (!item.publisher) this._associateDBField(item, "412", "a", "publisher");
		if (!item.title) this._associateDBField(item, "331", "a", "title");
		if (!item.title) this._associateDBField(item, "1300", "a", "title");
		if (!item.date) this._associateDBField(item, "425", "a", "date", pullNumber);
		if (!item.date) this._associateDBField(item, "595", "a", "date", pullNumber);
		if (this.getFieldSubfields("104")[0]) this._associateDBField(item, "104", "a", "creator", author, "author", true);
		if (this.getFieldSubfields("800")[0]) this._associateDBField(item, "800", "a", "creator", author, "author", true);

		// Spanish
		if (!item.title) this._associateDBField(item, "200", "a", "title");
		if (!item.place) this._associateDBField(item, "210", "a", "place");
		if (!item.publisher) this._associateDBField(item, "210", "c", "publisher");
		if (!item.date) this._associateDBField(item, "210", "d", "date");
		if (!item.creators) {
			for (let i = 700; i < 703; i++) {
				if (this.getFieldSubfields(i)[0]) {
					Zotero.debug(i + " is AOK");
					Zotero.debug(this.getFieldSubfields(i.toString()));
					let aut = this.getFieldSubfields(i)[0];
					if (aut.b) {
						aut = aut.b.replace(/,\W+/g, "") + " " + aut.a.replace(/,\s/g, "");
					}
					else {
						aut = aut.a.split(", ").join(" ");
					}
					item.creators.push(Zotero.Utilities.cleanAuthor(aut, "author"));
				}
			}
		}
		if (item.title) {
			item.title = Zotero.Utilities.capitalizeTitle(item.title);
		}
		if (this.getFieldSubfields("335")[0]) {
			item.title = item.title + ": " + this.getFieldSubfields("335")[0].a;
		}
		var otherIds = this.getFieldSubfields("024");
		for (let id of otherIds) {
			if (id['2'] == "doi") {
				item.DOI = id.a;
			}
		}
		var container = this.getFieldSubfields("773")[0];
		if (container) {
			var type = container['7'];
			switch (type) {
				case "nnam":
					item.itemType = "bookSection";
					break;
				case "nnas":
					item.itemType = "journalArticle";
					break;
				case "m2am":
					item.itemType = "conferencePaper";
					break;
				default: // some catalogs don't have the $7 subfield
					if (container.t && container.z) { // if there is an ISBN assume book section
						item.itemType = "bookSection";
					}
					else if (container.t) { // else default to journal article
						item.itemType = "journalArticle";
					}
			}
			var publication = container.t;
			if (item.itemType == "bookSection" || item.itemType == "conferencePaper") {
				var pubinfo = container.d;
				if (pubinfo) {
					item.place = pubinfo.replace(/:.+/, "");
					var publisher = pubinfo.match(/:\s*(.+),\s*\d{4}/);
					if (publisher) item.publisher = publisher[1];
					var year = pubinfo.match(/,\s*(\d{4})/);
					if (year) item.date = year[1];
				}
				if (publication) {
					var publicationTitle = publication.replace(/\..*/, "");
					if (item.itemType == "bookSection") {
						item.bookTitle = publicationTitle;
					}
					else {
						item.proceedingsTitle = publicationTitle;
					}
					if (publication.includes("Edited by")) {
						var editors = publication.match(/Edited by\s+(.+)\.?/)[1];
						editors = editors.split(/\s+and\s+|\s*,\s*|\s*;\s*/);
						for (let i = 0; i < editors.length; i++) {
							item.creators.push(ZU.cleanAuthor(editors[i], "editor"));
						}
					}
				}
				var pages = container.g;
				if (pages) {
					pagerange = pages.match(/[ps]\.\s*(\d+(-\d+)?)/);
					// if we don't have a page marker, we'll guess that a number range is good enough but
					if (!pagerange) pagerange = pages.match(/(\d+-\d+)/);
					if (pagerange) item.pages = pagerange[1];
				}
				var event = container.a;
				if (event) {
					item.conferenceName = event.replace(/[{}]/g, "");
				}
				item.ISBN = container.z;
			}
			else {
				if (publication) {
					item.publicationTitle = publication.replace(/[.,\s]+$/, "");
				}
				item.journalAbbreviation = container.p;
				var locators = container.g;
				if (locators) {
					// unfortunately there is no standardization whatsoever here
					var pagerange = locators.match(/[ps]\.\s*(\d+(-\d+)?)/);
					// For Journals, since there are a lot of issue-ranges we require the first number to have >=2 digits
					if (!pagerange) pagerange = locators.match(/(\d\d+-\d+)/);
					if (pagerange) item.pages = pagerange[1];
					var date = locators.match(/((Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\.?\s*)?\d{4}/);
					if (date) {
						item.date = date[0];
					}
					if (locators.match(/(?:vol\.|bd\.)\s*(\d+)/i)) {
						item.volume = locators.match(/(?:vol\.|bd\.)\s*(\d+)/i)[1];
					}
					if (locators.match(/(?:vol\.|bd\.)\s*\d+\s*,\s*(?:no\.|nr\.)\s*(\d[\d/]*)/i)) {
						item.issue = locators.match(/(?:vol\.|bd\.)\s*\d+\s*,\s*(?:no\.|nr\.)\s*(\d[\d/]*)/i)[1];
					}
					if (!item.volume && locators.match(/\d+:\d+/)) {
						item.volume = locators.match(/(\d+):\d+/)[1];
						item.issue = locators.match(/\d+:(\d+)/)[1];
					}
					item.ISSN = container.x;
				}
			}
		}
	}
	// editors get mapped as contributors - but so do many others who should be
	// --> for books that don't have an author, turn contributors into editors.
	if (item.itemType == "book") {
		var hasAuthor = false;
		for (let i = 0; i < item.creators.length; i++) {
			if (item.creators[i].creatorType == "author") {
				hasAuthor = true;
			}
		}
		if (!hasAuthor) {
			for (let i = 0; i < item.creators.length; i++) {
				if (item.creators[i].creatorType == "contributor") {
					item.creators[i].creatorType = "editor";
				}
			}
		}
	}
};

function doImport() {
	var text;
	var holdOver = "";	// part of the text held over from the last loop

	// eslint-disable-next-line no-cond-assign
	while (text = Zotero.read(4096)) {	// read in 4096 byte increments
		var records = text.split("\x1D");

		if (records.length > 1) {
			records[0] = holdOver + records[0];
			holdOver = records.pop(); // skip last record, since it's not done

			for (var i in records) {
				var newItem = new Zotero.Item();

				// create new record
				var rec = new record();
				rec.importBinary(records[i]);
				rec.translate(newItem);

				newItem.complete();
			}
		}
		else {
			holdOver += text;
		}
	}
}

var exports = {
	record: record,
	fieldTerminator: fieldTerminator,
	recordTerminator: recordTerminator,
	subfieldDelimiter: subfieldDelimiter
};

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "import",
		"input": "01841cam a2200385Ma 45\u00020001000700000005001700007008004100024010001700065035002300082035001800105040003000123043001200153050001500165049001500180100003900195245028100234260005900515300006100574500019500635500014500830510003000975510002701005510004501032500002601077610004401103600004001147600004801187650004501235610004501280852005801325946003101383910001001414994001201424947001901436\u001e790862\u001e20080120004008.0\u001e880726s1687    sp bf         000 0cspa d\u001e  \u001fa   03021876 \u001e  \u001fa(OCoLC)ocm29051663\u001e  \u001fa(NBYdb)790862\u001e  \u001faMNU\u001fcMNU\u001fdOCL\u001fdDIBAM\u001fdIBV\u001e  \u001fas-py---\u001e0 \u001faF2681\u001fb.X3\u001e  \u001faIBVA\u001flbklr\u001e1 \u001faXarque, Francisco,\u001fdca. 1609-1691.\u001e10\u001faInsignes missioneros de la Compañia de Jesus en la prouincia del Paraguay :\u001fbestado presente de sus missiones en Tucuman, Paraguay, y Rio de la Plata, que comprehende su distrito /\u001fcpor el doct. d. Francisco Xarque, dean de la Catredral [sic] de Santa Maria de Albarrazin ...\u001e  \u001faEn Pamplona :\u001fbPor Juan Micòn, Impressor,\u001fcaño 1687.\u001e  \u001fa[24], 432 p., [1] folded leaf of plates :\u001fbmap ;\u001fc22 cm.\u001e  \u001faBrunet and Graesse both mention a map of Paraguay; this copy has a map of Chile with title: Tabula geocraphica [sic] regni Chile / studio et labore P. Procuratoris Chilensis Societatis Jesu.\u001e  \u001faIn 3 books; the first two are biographies of Jesuits, Simon Mazeta and Francisco Diaz Taño, the 3rd deals with Jesuit missions in Paraguay.\u001e4 \u001faNUC pre-1956,\u001fcNX0000604.\u001e4 \u001faSabin,\u001fc105716 (v.29).\u001e4 \u001faPalau y Dulcet (2nd ed.),\u001fc123233 (v.7).\u001e  \u001faHead and tail pieces.\u001e20\u001faJesuits\u001fzParaguay\u001fvEarly works to 1800.\u001e10\u001faMasseta, Simon,\u001fdca. 1582-ca. 1656.\u001e10\u001faCuellar y Mosquera, Gabriel de,\u001fd1593-1677.\u001e 0\u001faMissions\u001fzParaguay\u001fvEarly works to 1800.\u001e20\u001faJesuits\u001fvBiography\u001fvEarly works to 1800.\u001e8 \u001fbvau,ayer\u001fkVAULT\u001fhAyer\u001fi1343\u001fi.J515\u001fiP211\u001fiX2\u001fi1687\u001ft1\u001e  \u001faOCLC RECON PROJECT\u001farc3758\u001e  \u001fa35535\u001e  \u001fa02\u001fbIBV\u001e  \u001faMARS\u001fa20071227\u001e\u001d",
		"items": [
			{
				"itemType": "book",
				"title": "Insignes missioneros de la Compañia de Jesus en la prouincia del Paraguay: estado presente de sus missiones en Tucuman, Paraguay, y Rio de la Plata, que comprehende su distrito",
				"creators": [
					{
						"firstName": "Francisco",
						"lastName": "Xarque",
						"creatorType": "author"
					}
				],
				"date": "1687",
				"callNumber": "VAULT Ayer 1343 .J515 P211 X2 1687",
				"extra": "OCLC: ocm29051663",
				"numPages": "24",
				"place": "En Pamplona",
				"publisher": "Por Juan Micòn, Impressor",
				"attachments": [],
				"tags": [
					{
						"tag": "Biography Early works to 1800"
					},
					{
						"tag": "Cuellar y Mosquera, Gabriel de"
					},
					{
						"tag": "Early works to 1800"
					},
					{
						"tag": "Early works to 1800"
					},
					{
						"tag": "Jesuits"
					},
					{
						"tag": "Jesuits"
					},
					{
						"tag": "Masseta, Simon"
					},
					{
						"tag": "Missions"
					},
					{
						"tag": "Paraguay"
					},
					{
						"tag": "Paraguay"
					}
				],
				"notes": [
					{
						"note": "Brunet and Graesse both mention a map of Paraguay; this copy has a map of Chile with title: Tabula geocraphica [sic] regni Chile / studio et labore P. Procuratoris Chilensis Societatis Jesu In 3 books; the first two are biographies of Jesuits, Simon Mazeta and Francisco Diaz Taño, the 3rd deals with Jesuit missions in Paraguay Head and tail pieces"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "18789nmm a2201429 c 4500001001000000003000700010005001700017007001500034008004100049015001900090016002200109020003700131020003700168024003600205024003500241035002100276035001600297035001800313035002100331035002200352035002500374040002900399041000800428050001100436082001300447245010000460260003900560300003400599337001000633490007600643500014600719520109000865533015001955650005902105650005602164650005502220650006302275650002302338650000802361653002502369653002802394653002302422653000802445689005402453689005102507689005002558689005802608689002002666689002302686689001102709700005902720711006402779830003002843856004802873856003402921856004702955856007303002856005503075856007503130856007103205856007503276856008003351856008503431856014303516900010603659900025003765900024704015900023204262900024104494900024704735900024504982900025005227900024705477900033005724900031306054900024906367900025106616900025106867900028907118900019807407900035207605900028307957900024708240900025008487900030108737900025309038900030309291900030209594900026109896900030810157912001510465912002010480912001510500950003910515951001210554954010910566954024910675954024810924954023611172954024911408954024811657954024811905954025512153954024812408954032812656954032312984954024913307954024913556954024913805954028614054954019814340954035514538954028414893954025015177954025015427954029615677954024915973954029616222954029616518954024916814954029617063\u001e607843365\u001eDE-601\u001e20141226042756.0\u001ecr uuu---uuuuu\u001e090828s2009    gw            000 0 ger d\u001e  \u001fa09A450429\u001f2dnb\u001e7 \u001fa99753513X\u001f2DE-101\u001e  \u001fa9783642002304\u001f9978-3-642-00230-4\u001e  \u001fa9783642002298\u001f9978-3-642-00229-8\u001e7 \u001faurn:nbn:de:1111-2009102027\u001f2urn\u001e7 \u001fa10.1007/978-3-642-00230-4\u001f2doi\u001e  \u001fa(OCoLC)699070134\u001e  \u001faebr10318806\u001e  \u001fa9783642002304\u001e  \u001fa(OCoLC)646815275\u001e  \u001fa(ZDB-22-CAN)30851\u001e  \u001fa(DE-599)GBV607843365\u001e  \u001faGBVCP\u001fbger\u001fcGBVCP\u001ferakwb\u001e0 \u001fager\u001e 0\u001faKK7058\u001e09\u001fa330\u001fa340\u001e00\u001faEigentumsverfassung und Finanzkrise\u001fhElektronische Ressource\u001fcherausgegeben von Otto Depenheuer\u001e3 \u001faBerlin ;Heidelberg\u001fbSpringer\u001fc2009\u001e  \u001faOnline-Ressource\u001fbv.: digital\u001e  \u001faeBook\u001e0 \u001faBibliothek des Eigentums, Im Auftrag der Deutschen Stiftung Eigentum\u001fv7\u001e  \u001fa\"Unter dem Thema 'Eigentumsverfassung und Finanzkrise' veranstaltete die Deutsche Stiftung Eigentum am 22. April 2009 in Berlin ein Symposion\u001e  \u001faDie weltweite Finanzkrise ist Anlass, an Funktion und Wirkweise des privaten Eigentums in einer freiheitlichen Gesellschafts- und Wirtschaftsordnung zu erinnern. Privates Eigentum muss es geben, damit Verantwortung zugerechnet und Haftung realisiert, Gewinn und Verlust einem konkreten Verantwortungsträger persönlich zugerechnet werden können. Die Verletzung dieser konstitutiven Regeln einer auf privatem Eigentum basierenden Wirtschaftsordnung ist wesentlich ursächlich für das eingetretene Desaster auf den Finanzmärkten. Wie alle kulturellen Errungenschaften muss auch die Idee des privaten Eigentums, insbesondere die ihr immanente Bereitschaft zur Übernahme persönlicher Verantwortung des Eigentümers, jeder Generation erneut wieder in Erinnerung gerufen, überzeugend um sie geworben und vor allem vorbildhaft von den Akteuren in Politik und Wirtschaft vorgelebt werden. Nur so kann strukturelles Vertrauen in das Finanzsystem wieder gewonnen werden. Denn in ihrer vertrauensbildenden Kraft liegt die ordnungspolitische Funktion der Gewährleistung privaten Eigentums.\u001e  \u001faOnline-Ausg.\u001fd2009\u001ffSpringer eBook Collection. Humanities, Social Science\u001fnElectronic reproduction; Available via World Wide Web\u001f7|2009||||||||||\u001e 7\u001f0(DE-601)587272910\u001f0(DE-588)7635855-0\u001faFinanzkrise\u001f2gnd\u001e 7\u001f0(DE-601)106341901\u001f0(DE-588)4013793-4\u001faEigentum\u001f2gnd\u001e 7\u001f0(DE-601)106306553\u001f0(DE-588)4022898-8\u001faHaftung\u001f2gnd\u001e 7\u001f0(DE-601)105665223\u001f0(DE-588)4135420-5\u001faOrdnungspolitik\u001f2gnd\u001e 0\u001faConstitutional law\u001e 0\u001faLaw\u001e 7\u001faAufsatzsammlung\u001f2gnd\u001e 7\u001faOnline-Publikation\u001f2gnd\u001e 0\u001faConstitutional law\u001e 0\u001faLaw\u001e00\u001f0(DE-601)587272910\u001f0(DE-588)7635855-0\u001faFinanzkrise\u001e01\u001f0(DE-601)106341901\u001f0(DE-588)4013793-4\u001faEigentum\u001e02\u001f0(DE-601)106306553\u001f0(DE-588)4022898-8\u001faHaftung\u001e03\u001f0(DE-601)105665223\u001f0(DE-588)4135420-5\u001faOrdnungspolitik\u001e04\u001faAufsatzsammlung\u001e05\u001faOnline-Publikation\u001e0 \u001f5DE-101\u001e1 \u001faDepenheuer, Otto\u001f0(DE-601)50677211X\u001f0(DE-588)130850616\u001e2 \u001faSymposion. Deutsche Stiftung Eigentum\u001fd(2009.04.22\u001fcBerlin)\u001e  \u001fw(DE-601)601927117\u001fv7\u001f9700\u001e40\u001fuhttp://dx.doi.org/10.1007/978-3-642-00230-4\u001e40\u001fuhttp://d-nb.info/99753513X/34\u001e40\u001fuhttp://www.springerlink.com/content/v441t4\u001e40\u001fuhttp://site.ebrary.com/lib/alltitles/docDetail.action?docID=10318806\u001e40\u001fuhttp://nbn-resolving.de/urn:nbn:de:1111-2009102027\u001e41\u001fuhttp://ebooks.ciando.com/book/index.cfm/bok_id/30851\u001fmCIANDO\u001f3Volltext\u001e42\u001fyC\u001fuhttp://www.ciando.com/img/books/3642002307_k.jpg\u001fmCIANDO\u001f3Cover\u001e42\u001fyC\u001fuhttp://www.ciando.com/img/books/big/3642002307_k.jpg\u001fmCIANDO\u001f3Cover\u001e42\u001fyC\u001fuhttp://www.ciando.com/img/books/width167/3642002307_k.jpg\u001fmCIANDO\u001f3Cover\u001e42\u001fyC\u001fuhttp://www.ciando.com/pictures/bib/3642002307bib_t_1_70483.jpg\u001fmCIANDO\u001f3Cover\u001e42\u001fuhttp://external.dandelon.com/download/attachments/dandelon/ids/DEAGIDC0E3B4C91F575E1C12575DF005CF4D3.pdf\u001fmV:DE-601;AGI\u001f3Inhaltsverzeichnis\u001e  \u001faGBV\u001fbSUB Bremen <46>\u001ffFreie Nutzung im Campusnetz der Universität und der Hochschulen im Land Bremen\u001e  \u001faGBV\u001fbSUB+Uni Hamburg <18>\u001ffVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001e  \u001faGBV\u001fbTUB Hamburg <830>\u001ffVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001e  \u001faGBV\u001fbTHULB Jena <27>\u001ffVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden.\u001e  \u001faGBV\u001fbHAW Hamburg\u001ffVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001e  \u001faGBV\u001fbHSU Hamburg <705>\u001ffVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001e  \u001faGBV\u001fbUB Rostock <28>\u001ffVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001e  \u001faGBV\u001fbULB Halle <3>\u001fdebook\u001ffVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001e  \u001faGBV\u001fbUB Greifswald <9>\u001ffVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001e  \u001faGBV\u001fbTIB/UB Hannover <89>\u001ffCampusweiter Zugriff (Universität Hannover). - Vervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001ffErworben aus Studienbeiträgen\u001e  \u001faGBV\u001fbHAWK HHG\u001ffVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001ffFreie Nutzung im Campusnetz der Hochschule und für registrierte Benutzer\u001e  \u001faGBV\u001fbUB Magdeburg <Ma 9>\u001ffVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001e  \u001faGBV\u001fbMZB Magdeburg <Ma 14>\u001ffVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001e  \u001faGBV\u001fbUB Lüneburg <Luen 4>\u001ffVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001e  \u001faGBV\u001fbBIS Uni Oldenburg <715>\u001ffCampusweiter Zugriff (Universität Oldenburg). - Vervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden.\u001e  \u001faGBV\u001fbUB Osnabrück <700>\u001ffVervielfältigungen (z. B. Kopien, Downloads) nur für den eigenen wissenschaftlichen Gebrauch. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots\u001e  \u001faGBV\u001fbUB Vechta <Va 1>\u001ffVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001ffZugriff von allen internetfähigen Rechnern innerhalb des Campusnetzes der Universität Vechta möglich.\u001e  \u001faGBV\u001fbHS Osnabrueck <959>\u001ffVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001ffFinanziert aus Studienbeiträgen\u001e  \u001faGBV\u001fbHS Wismar <Wis 1>\u001ffVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001e  \u001faGBV\u001fbHSB Emden/Leer <755>\u001ffVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001e  \u001faGBV\u001fbHochschule Hannover <960>\u001ffCampusweiter Zugriff (Hochschule Hannover). - Vervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001e  \u001faGBV\u001fbHS Neubrandenburg <519>\u001ffVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001e  \u001faGBV\u001fbHS Magdeburg-Stendal <551>\u001ffCampusweiter Zugriff (HS Magdeburg-Stendal). - Vervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001e  \u001faGBV\u001fbHS MD-SDL (Stendal) <552>\u001ffCampusweiter Zugriff (HS Magdeburg-Stendal). - Vervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001e  \u001faGBV\u001fbUB Potsdam <517>\u001fd!1960! \u001fxL\u001fzC\u001ffVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001e  \u001faGBV\u001fbBibl. Kurt-Schwitters-F. <960/3>\u001ffCampusweiter Zugriff (Hochschule Hannover). - Vervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001e  \u001faZDB-38-EBR\u001e  \u001faZDB-2-SGR\u001fb2009\u001e  \u001faZDB-22-CAN\u001e  \u001faPolitik Wirtschaftspolitik\u001f2ciando\u001e  \u001faww\u001f2120\u001e  \u001fa21\u001fb204841267\u001fc01\u001fkFreie Nutzung im Campusnetz der Universität und der Hochschulen im Land Bremen\u001fx0046\u001e  \u001fa22\u001fb1157518338\u001fc01\u001fkVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001fx0018\u001e  \u001fa23\u001fb204845807\u001fc01\u001fkVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001fx0830\u001e  \u001fa31\u001fb1110832494\u001fc01\u001fkVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden.\u001fx0027\u001e  \u001fa34\u001fb1112445323\u001fc01\u001fkVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001fx3551\u001e  \u001fa60\u001fb204839033\u001fc01\u001fkVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001fx0705\u001e  \u001fa62\u001fb204864348\u001fc01\u001fkVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001fx0028\u001e  \u001fa65\u001fb204864933\u001fc01\u001fdebook\u001fkVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001fx0003\u001e  \u001fa69\u001fb204847389\u001fc01\u001fkVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001fx0009\u001e  \u001fa70\u001fb204843235\u001fc01\u001fkCampusweiter Zugriff (Universität Hannover). - Vervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001fkErworben aus Studienbeiträgen\u001fx0089\u001e  \u001fa91\u001fb204828465\u001fc01\u001fkVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001fkFreie Nutzung im Campusnetz der Hochschule und für registrierte Benutzer\u001fx3091\u001e  \u001fa100\u001fb204854784\u001fc01\u001fkVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001fx3100\u001e  \u001fa101\u001fb204859581\u001fc01\u001fkVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001fx3101\u001e  \u001fa110\u001fb204849047\u001fc01\u001fkVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001fx3110\u001e  \u001fa120\u001fb1107373360\u001fc01\u001fkCampusweiter Zugriff (Universität Oldenburg). - Vervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden.\u001fx0715\u001e  \u001fa130\u001fb204860288\u001fc01\u001fkVervielfältigungen (z. B. Kopien, Downloads) nur für den eigenen wissenschaftlichen Gebrauch. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots\u001fx0700\u001e  \u001fa131\u001fb204865581\u001fc01\u001fkVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001fkZugriff von allen internetfähigen Rechnern innerhalb des Campusnetzes der Universität Vechta möglich.\u001fx3131\u001e  \u001fa132\u001fb1109827059\u001fc01\u001fkVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001fkFinanziert aus Studienbeiträgen\u001fx0959\u001e  \u001fa136\u001fb1177584336\u001fc01\u001fkVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001fx3526\u001e  \u001fa160\u001fb1348735406\u001fc01\u001fkVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001fx0755\u001e  \u001fa161\u001fb1284974146\u001fc01\u001fkCampusweiter Zugriff (Hochschule Hannover). - Vervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001fx0960\u001e  \u001fa186\u001fb204837022\u001fc01\u001fkVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001fx0519\u001e  \u001fa213\u001fb204835119\u001fc01\u001fkCampusweiter Zugriff (HS Magdeburg-Stendal). - Vervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001fx0551\u001e  \u001fa230\u001fb204836433\u001fc01\u001fkCampusweiter Zugriff (HS Magdeburg-Stendal). - Vervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001fx0552\u001e  \u001fa285\u001fb204862256\u001fc01\u001fkVervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001fx0517\u001e  \u001fa293\u001fb1284989569\u001fc01\u001fkCampusweiter Zugriff (Hochschule Hannover). - Vervielfältigungen (z.B. Kopien, Downloads) sind nur von einzelnen Kapiteln oder Seiten und nur zum eigenen wissenschaftlichen Gebrauch erlaubt. Keine Weitergabe an Dritte. Kein systematisches Downloaden durch Robots.\u001fx3293\u001e\u001d",
		"items": [
			{
				"itemType": "book",
				"title": "Eigentumsverfassung und Finanzkrise",
				"creators": [
					{
						"firstName": "Otto",
						"lastName": "Depenheuer",
						"creatorType": "editor"
					}
				],
				"date": "2009",
				"ISBN": "9783642002304 9783642002298",
				"abstractNote": "Die weltweite Finanzkrise ist Anlass, an Funktion und Wirkweise des privaten Eigentums in einer freiheitlichen Gesellschafts- und Wirtschaftsordnung zu erinnern. Privates Eigentum muss es geben, damit Verantwortung zugerechnet und Haftung realisiert, Gewinn und Verlust einem konkreten Verantwortungsträger persönlich zugerechnet werden können. Die Verletzung dieser konstitutiven Regeln einer auf privatem Eigentum basierenden Wirtschaftsordnung ist wesentlich ursächlich für das eingetretene Desaster auf den Finanzmärkten. Wie alle kulturellen Errungenschaften muss auch die Idee des privaten Eigentums, insbesondere die ihr immanente Bereitschaft zur Übernahme persönlicher Verantwortung des Eigentümers, jeder Generation erneut wieder in Erinnerung gerufen, überzeugend um sie geworben und vor allem vorbildhaft von den Akteuren in Politik und Wirtschaft vorgelebt werden. Nur so kann strukturelles Vertrauen in das Finanzsystem wieder gewonnen werden. Denn in ihrer vertrauensbildenden Kraft liegt die ordnungspolitische Funktion der Gewährleistung privaten Eigentums",
				"callNumber": "KK7058",
				"extra": "OCLC: 699070134",
				"language": "ger",
				"place": "Berlin ;Heidelberg",
				"publisher": "Springer",
				"series": "Bibliothek des Eigentums, Im Auftrag der Deutschen Stiftung Eigentum",
				"seriesNumber": "7",
				"url": "http://dx.doi.org/10.1007/978-3-642-00230-4",
				"attachments": [],
				"tags": [
					{
						"tag": "Aufsatzsammlung"
					},
					{
						"tag": "Constitutional law"
					},
					{
						"tag": "Constitutional law"
					},
					{
						"tag": "Eigentum"
					},
					{
						"tag": "Finanzkrise"
					},
					{
						"tag": "Haftung"
					},
					{
						"tag": "Law"
					},
					{
						"tag": "Law"
					},
					{
						"tag": "Online-Publikation"
					},
					{
						"tag": "Ordnungspolitik"
					}
				],
				"notes": [
					{
						"note": "\"Unter dem Thema 'Eigentumsverfassung und Finanzkrise' veranstaltete die Deutsche Stiftung Eigentum am 22. April 2009 in Berlin ein Symposion"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "import",
		"input": "01527pam a2200421 cc4500001001000000003000700010005001700017007000300034008004100037015003400078016002200112020008000134024001800214028002300232035002500255035002100280040003500301041000800336044001300344082002900357084002700386090000600413100006900419245011400488250001400602259000700616260004600623300003200669653004200701653003200743653002800775653002600803653004800829773002600877856008100903856011400984925000701098\u001e987805282\u001eDE-101\u001e20080603235442.0\u001etu\u001e080304s2008    gw ||||| |||| 00||||ger  \u001e  \u001fa08,A24,0901\u001fz08,N12,0064\u001f2dnb\u001e7 \u001f2DE-101\u001fa987805282\u001e  \u001fa9783540774310\u001fckart. : EUR 24.95, sfr 41.00 (freier Pr.)\u001f9978-3-540-77431-0\u001e3 \u001fa9783540774310\u001e52\u001faBest.-Nr. 12208951\u001e  \u001fa(DE-599)DNB987805282\u001e  \u001fa(OCoLC)244010073\u001e  \u001fa1145\u001fbger\u001fcDE-101\u001fd9999\u001ferakwb\u001e  \u001fager\u001e  \u001fcXA-DE-BE\u001e74\u001fa510\u001fa004\u001fqDE-101\u001f222sdnb\u001e  \u001fa510\u001fa004\u001fqDE-101\u001f2sdnb\u001e  \u001fab\u001e1 \u001f0(DE-588)140501037\u001f0(DE-101)140501037\u001faTeschl, Gerald\u001fd1970-\u001f4aut\u001e10\u001faMathematik für Informatiker\u001fnBd. 1\u001fpDiskrete Mathematik und lineare Algebra\u001fcGerald Teschl ; Susanne Teschl\u001e  \u001fa3., Aufl.\u001e  \u001fa13\u001e3 \u001faBerlin\u001faHeidelberg\u001fbSpringer Vieweg\u001fc2008\u001e  \u001faXIII, 514 S.\u001fbgraph. Darst.\u001e  \u001fa(VLB-FS)Mathematik für Informatiker\u001e  \u001fa(VLB-FS)Diskrete Mathematik\u001e  \u001fa(VLB-FS)Lineare Algebra\u001e  \u001fa(VLB-PF)BC: Paperback\u001e  \u001fa(VLB-WN)1632: HC/Informatik, EDV/Informatik\u001e08\u001fq11\u001fw(DE-101)976481294\u001e42\u001fmB:DE-101\u001fqapplication/pdf\u001fuhttp://d-nb.info/987805282/04\u001f3Inhaltsverzeichnis\u001e42\u001fmX:MVB\u001fqtext/html\u001fuhttp://deposit.d-nb.de/cgi-bin/dokserv?id=3077737&prov=M&dok_var=1&dok_ext=htm\u001f3Inhaltstext\u001er \u001fara\u001e\u001d",
		"items": [
			{
				"itemType": "book",
				"title": "Mathematik für Informatiker. Bd. 1: Diskrete Mathematik und lineare Algebra",
				"creators": [
					{
						"firstName": "Gerald",
						"lastName": "Teschl",
						"creatorType": "author"
					}
				],
				"date": "2008",
				"ISBN": "9783540774310",
				"callNumber": "b",
				"edition": "3., Aufl",
				"language": "ger",
				"numPages": "514",
				"place": "Berlin Heidelberg",
				"publisher": "Springer Vieweg",
				"attachments": [],
				"tags": [
					"(VLB-FS)Diskrete Mathematik",
					"(VLB-FS)Lineare Algebra",
					"(VLB-FS)Mathematik für Informatiker",
					"(VLB-PF)BC: Paperback",
					"(VLB-WN)1632: HC/Informatik, EDV/Informatik"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/

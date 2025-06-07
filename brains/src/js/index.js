var moment = require('moment'); // require for turning AU time into a workable format
var XLSX = require('xlsx'); // require for reading excel sheets

$(document).ready(function(){
	let progressBar = $("[data-progress-bar]");

	// init fill the matcher with req. headings
	let requiredFields = $(document).find("[data-headings]").attr('data-headings').split(',');
	fillMatcher(requiredFields,requiredFields);

	function exportToArray() { // create an array before exporting to HTML table

		// inactivate table
		let table = $(document).find('[data-results-output]');
		table.addClass('is-inactive');
		let resultsJSON = []; 
		var regex = /^([a-zA-Z0-9\s_\\.\-:])+(.csv)$/;  
		//Checks whether the file is a valid csv file    
		if (regex.test($("[data-file-upload]").val().toLowerCase())) {
			// reset the error log
			$(document).find('[data-error-alert]').text('');
			$(document).find('[data-process-results]').text('PROCESSING...'); // start loading animation
			//Checks whether the browser supports HTML5    
			if (typeof(FileReader) != "undefined") {  
				// rock and roll!
				var reader = new FileReader();
				let fileUpload = $("[data-file-upload]")[0].files[0];

				// process the file
				reader.readAsText(fileUpload); 


				reader.onload = function(e) {  
					//Splitting of Rows in the csv file    
					var csvrows = e.target.result.split("\n"); 
					var headings = csvrows[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); // put the first row into an array of headings	**USE REGEX TO ALLOW COMMAS IN CELL DATA

					// clean up the headings
					$(headings).each(function(i){
						headings[i] = headings[i].trim();
					})


					for (var i = 1; i < csvrows.length; i++) {  // start at i=1 to skip headings row
					

						if (csvrows[i] != "") {
							var rowJSON = {};
							var csvcols = csvrows[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);  // **USE REGEX TO ALLOW COMMAS IN CELL DATA
							//Looping through each cell in a csv row    
							for (var j = 0; j < csvcols.length; j++) {								
								rowJSON[headings[j]] = csvcols[j];
							}
							resultsJSON.push(rowJSON);  

							
						}  
					}
					try{
						filterDates(resultsJSON);
					}catch(error){
						errorAlert('failed filtering dates');
					};
				}  
			} else {  
				alert("Sorry! Your browser does not support HTML5!");  
			} 
		} else { 
			alert('please select a CSV file.');
			errorAlert('please select a CSV file');
			// let newregex = /^([a-zA-Z0-9\s_\\.\-:])+(.xlsx)$/; 
			// if(newregex.test($("[data-file-upload]").val().toLowerCase())){
			// 	var workbook = XLSX.read($("[data-file-upload]")[0].files[0]);
			// 	consoleeeeeee.log($("[data-file-upload]")[0]);
			// }else{
			// 	alert("Please select a valid CSV or Excel file!");  
			// }
		}
	}  


	function filterDates(resultsJSON) {
		
		// use the headings from data hidden in HTML instead
		let headingsHTML = $(document).find("[data-headings]").attr('data-headings');
		headings = headingsHTML.split(',');

		// get the start and end dates
		let startDate = parseInt($(document).find('[data-start-date]').attr('data-date'));
		let endDate = parseInt($(document).find('[data-end-date]').attr('data-date'));

		// for each line item, except the first row of headings
		$(resultsJSON).each(function(index){
			let row = $(this);
			// filter out any rows outside the dates set above
			// get date
			let dateString = String(row[0][headings[12]]).trim();
			// convert format
			// date = date.split('/');
			// date = date[1]+'/'+date[0]+'/'+date[2]; // mm/dd/yyyy because of idiot americans
			let dueDate = new Date(dateString);

			startDate = new Date(startDate);
			endDate = new Date(endDate);
			

			// less than startDate, remove
			if(dueDate < startDate){
				delete resultsJSON[index];
			}
			// greater than endDate, remove
			if(dueDate > endDate){
				delete resultsJSON[index];
			}

		})
		try{
			filterIrrelevant(resultsJSON);
		}catch(error){
			errorAlert('failed filtering irrelevant data');
		};
	}

	function filterIrrelevant(resultsJSON) {
		
		// use the headings from data hidden in HTML instead
		let headingsHTML = $(document).find("[data-headings]").attr('data-headings');
		headings = headingsHTML.split(',');

		// for each line item, except the first row of headings
		$(resultsJSON).each(function(index){
			let row = this;
			
			// blank grade
			if(row[headings[7]] == ''){
				delete resultsJSON[index];
			}

			// zero grade total
			if(row[headings[8]] == 0){
				delete resultsJSON[index];
			}

			// submission type
			if(row[headings[6]] == ('"[""none""]"')){
				delete resultsJSON[index];
			}

			// assessment name
			if(row[headings[5]] == ('OPELA' || 'considerations')){
				delete resultsJSON[index];
			}
		})
		try{
			mergeStudent(resultsJSON);
		}catch(error){
			errorAlert('failed merging student data');
		};
	}

	function mergeStudent(resultsJSON){
		
		// use the headings from data hidden in HTML instead
		let headingsHTML = $(document).find("[data-headings]").attr('data-headings');
		headings = headingsHTML.split(',');

		// all rows with the same email address become a set of results for a student
		let emailArray = [];
		$(resultsJSON).each(function(index){
			let row = this;
			// clear any "deleted" rows from before
			if(row[headings[0]] === undefined){
				resultsJSON.slice(index, 1);
			}else{
				emailArray.push(row[headings[0]]); // for unique array of names
			}
		});
		// get array of unique names
		emailArray = $.unique(emailArray);

		let mergedArray = [];
		$(resultsJSON).each(function(index){
			let row = this;
		});
		$(emailArray).each(function(){
			let thisEmail = String(this);
			let thisStudent = [];
			thisStudent['results'] = [];
			thisStudent['email'] = thisEmail;
			$(resultsJSON).each(function(){
				let row = this;
				let email = String(row[headings[0]]);
				let studentID = String(row[headings[1]]);
				if(email == thisEmail){
					thisStudent['results'].push(row);
					thisStudent['student id'] = studentID;
				}
			})	
			mergedArray.push(thisStudent);
		})
		try{
			calcResults(mergedArray);
		}catch(error){
			errorAlert('failed calculating results');
		};
	}

	function calcResults(mergedArray){
		
		// use the headings from data hidden in HTML instead
		let headingsHTML = $(document).find("[data-headings]").attr('data-headings');
		headings = headingsHTML.split(',');

		// for each student
		$(mergedArray).each(function(){
			let thisStudent = this;
			let thisTotalGrade = 0;
			let thisTotalGradeTotal = 0;
			let numPass = 0; // count how many passed assessments, so we can work out the percentage overall
			// for each result
			$(thisStudent["results"]).each(function(){
				let thisResult = this;
				let thisGrade = parseInt(thisResult[headings[7]]);
				let thisGradeTotal = parseInt(thisResult[headings[8]]);
				if(thisResult[headings[7]].indexOf('%') != -1){ // if it is a percent, calculate the grade
					thisGrade = (thisGradeTotal / 100) * thisGrade;
					thisResult[headings[7]] = thisGrade;
				}
				
				// calc pass / fail
				if((thisGrade < (thisGradeTotal / 2)) || (thisResult[headings[9]] == 'unsubmitted') || (thisResult[headings[7]] == 'incomplete')){
					thisResult["passFail"] = "fail";
				}else{
					thisResult["passFail"] = "pass";
					numPass = numPass + 1; // add to the total number passed, so we can work out a percentage passed later
				}
				thisTotalGrade = thisTotalGrade + thisGrade; // add to the overall total for this student
				thisTotalGradeTotal = thisTotalGradeTotal + thisGradeTotal; // add to the overall total for this student
			});
			// get total result	if(thisGrade < (thisGradeTotal / 2)){
			if(thisTotalGrade < (thisTotalGradeTotal / 2)){
				thisStudent["passFail"] = "fail";
			}else{
				thisStudent["passFail"] = "pass";
			}
			// get the % passed and % failed (100 - % passed)
			thisStudent["passPerc"] = Math.round(100 / (thisStudent["results"].length / numPass));
			thisStudent["failPerc"] = 100 - Math.round(100 / (thisStudent["results"].length / numPass))	;
		})
		try{
			processTable(mergedArray);
		}catch(error){
			errorAlert('failed processing into table');
		};
	}

	function returnName(email){
		let emailStart = email.split('@')[0];
		let parts = emailStart.split('.');
		let fullName = parts.join(' ');
		return fullName;
	}

	function processTable(data){
		// use the headings from data hidden in HTML instead
		let headingsHTML = $(document).find("[data-headings]").attr('data-headings');
		headings = headingsHTML.split(',');

		let table = $(document).find('[data-results-output]');
		table.html(''); // clear table ready for new data
		$(data).each(function(index){
			let currentPercent = Math.round(100 / (data.length / index));
			progressBar.width(currentPercent+'%');
			if(currentPercent >= 99){
				setTimeout(function(){ // change to green and be full a second after finishing progress
					progressBar.width('100%').addClass('is-finished');
				}, 1000);
			};
			let thisStudent = this;
			let htmlRow = '<tr data-filter="'+thisStudent['passFail']+'"><td><table><tr data-toggle class="'+thisStudent['passFail']+'"><td><table>';
			htmlRow += '<td>'+returnName(thisStudent["email"])+'</td>';
			htmlRow += '<td>'+thisStudent["email"]+'</td>';
			htmlRow += '<td>'+thisStudent["student id"]+'</td>';
			htmlRow += '<td class="'+thisStudent['passFail']+'">Overall: '+thisStudent["passFail"]+' <hr /><span class="pass">'+thisStudent['passPerc']+'% assessments passed</span> / <span class="fail">'+thisStudent['failPerc']+'% assessments failed</span></td>';
			htmlRow += '</table></td><td class="toggle">';
			htmlRow += '<span class="expand"><?xml version="1.0" encoding="utf-8"?><svg fill="#000000" width="800px" height="800px" viewBox="-1 0 19 19" xmlns="http://www.w3.org/2000/svg" class="cf-icon-svg"><path d="M16.416 9.579A7.917 7.917 0 1 1 8.5 1.662a7.916 7.916 0 0 1 7.916 7.917zm-2.548-2.395a.792.792 0 0 0-1.12 0L8.5 11.433l-4.249-4.25a.792.792 0 0 0-1.12 1.12l4.809 4.809a.792.792 0 0 0 1.12 0l4.808-4.808a.792.792 0 0 0 0-1.12z"/></svg></span>';
			htmlRow += '<span class="contract"><?xml version="1.0" encoding="utf-8"?><svg fill="#000000" width="800px" height="800px" viewBox="-1.7 0 20.4 20.4" xmlns="http://www.w3.org/2000/svg" class="cf-icon-svg"><path d="M16.417 10.283A7.917 7.917 0 1 1 8.5 2.366a7.916 7.916 0 0 1 7.917 7.917zm-6.804.01 3.032-3.033a.792.792 0 0 0-1.12-1.12L8.494 9.173 5.46 6.14a.792.792 0 0 0-1.12 1.12l3.034 3.033-3.033 3.033a.792.792 0 0 0 1.12 1.119l3.032-3.033 3.033 3.033a.792.792 0 0 0 1.12-1.12z"/></svg></span>';
			htmlRow += '</td></tr>';
			htmlRow += '<tr class="accordion"><td><table>';
			htmlRow += '<tr><th>Pass/fail</th><th>Grade</th><th>Total</th><th>Submitted date</th><th>Due date</th><th>Submission state</th><th>Org Unit</th><th>Submission type</th></tr>';
			$(thisStudent['results']).each(function(){
				let thisResult = this;
				if(thisResult[headings[10]].length >= 4){ // >= 4 in case it is just an empty line ending booger
					dateSubmitted = new Date(thisResult[headings[10]].split('\r')[0]); //.split('\r')[0] to clean up boogers from line endings
					dateSubmitted = dateSubmitted.toLocaleDateString("en-GB");
				}else{
					dateSubmitted = 'no date';
				}
				if(thisResult[headings[12]].length >= 4){ // >= 4 in case it is just an empty line ending booger
					dateDue = new Date(thisResult[headings[12]].split('\r')[0]); //.split('\r')[0] to clean up boogers from line endings
					dateDue = dateDue.toLocaleDateString("en-GB");
				}else{
					dateDue = 'no date';
				}
				htmlRow += '<tr>';
				htmlRow += '<td class="'+thisResult['passFail']+'">'+thisResult['passFail']+'</td>';
				htmlRow += '<td>'+thisResult['grade']+'</td>';
				htmlRow += '<td>'+thisResult['grade total']+'</td>';
				htmlRow += '<td>'+dateSubmitted+'</td>';
				htmlRow += '<td>'+dateDue+'</td>';
				htmlRow += '<td class="'+thisResult['submission state']+'">'+thisResult['submission state']+'</td>';
				htmlRow += '<td>'+thisResult['site org unit']+'</td>';
				htmlRow += '<td>'+thisResult['submission type'].split('""]"')[0].split('"[""')[1].replaceAll('"",""', ' | ').replaceAll('_', ' ')+'</td>';
				htmlRow += '</tr>';
			})
			htmlRow += '</table></td></tr>';
			htmlRow += '</tr></table></td></tr>';
			table.append(htmlRow);
		})
		// all done
		$(document).find('[data-process-results]').text('DONE'); // stop loading animation
		$(document).find('[data-export-csv]').removeClass('is-inactive');

		table.removeClass('is-inactive');
		// show filters
		$(document).find('.filters').addClass('is-active');
	}

	// store date input as useable format
	$(document).on('change', '[data-start-date], [data-end-date]', function(e){
		e.stopPropagation();
		let self = $(this);
		let myDate = self.val();
		// convert date to useable format (uses moment.js)
		myDate = moment(myDate);
		// store date in data attr
		self.attr('data-date', myDate);
	})

	// handle click "PROCESS RESULTS" button
	$(document).on('click touchend', '[data-process-results]', function(e){
		e.stopPropagation();
		e.preventDefault();
		progressBar.width('10%').removeClass('is-finished', 'is-populating');
		setTimeout(function(){ // actually process a second after, so progress bar can show
			progressBar.width('15%').addClass('is-populating');
			try{
				exportToArray();
			}catch(error){
				errorAlert('unknown fail');
			};
		}, 1000);
	})

	// handle click filters
	$(document).on('click touchend', '[data-view]', function(e){
		e.stopPropagation();
		e.preventDefault();
		let self = $(this);
		let myFilter = self.attr('data-view');
		// if filter is "all"
		if(myFilter == 'all'){
			$(document).find('[data-filter]').removeClass('is-hidden'); // show all
		}else{
			$(document).find('[data-filter]').addClass('is-hidden'); // hide all
			$(document).find('[data-filter="'+myFilter+'"]').removeClass('is-hidden'); // reveal only filtered	
		}
		//deactivate buttons
		$(document).find("[data-view]").removeClass('is-active');
		self.addClass('is-active');
	})

	// handle toggle accordions
	$(document).on('click touchend', '[data-toggle]', function(e){
		e.stopPropagation();
		e.preventDefault();
		let self = $(this);
		let thisAccordion = self.closest('[data-filter]');
		if(thisAccordion.hasClass('is-open')){
			thisAccordion.removeClass('is-open');
		}else{
			thisAccordion.addClass('is-open');
		}
	})


	// handle export to csv
	$(document).on('click touchen', '[data-export-csv]', function(e){
		e.preventDefault();
		e.stopPropagation();

		let exportJSON = [];
		$(document).find('[data-toggle] tr').each(function(){
			let self = $(this);
			let rowJSON = {};
			self.find('td').each(function(index){
				let thisCell = $(this);
				if(thisCell.hasClass('pass') || thisCell.hasClass('fail')){ // for the overall results cell, we'll need to do some tidying
					let cellCode = thisCell.html();
					let cellOverall = cellCode.split('<hr>')[0].replace('Overall: ','');
					let cellPassFail = cellCode.split('<hr>')[1];
					let cellPass = cellPassFail.split(' / ')[0].replace('<span class="pass">', '').replace('assessments passed</span>', '');
					let cellFail = cellPassFail.split(' / ')[1].replace('<span class="fail">', '').replace('assessments failed</span>', '');
					rowJSON[index] = cellOverall;
					rowJSON[index + 1] = cellPass;
					rowJSON[index + 2] = cellFail;
				}else{
					rowJSON[index] = thisCell.text();
				}
			});
			exportJSON.push(rowJSON);
		});
		let csvContent = "data:text/csv;charset=utf-8,";
		csvContent += 'name,email,ID,overall,% passed,% failed,\r\n';
		$(exportJSON).each(function() {
		    let thisRow = $(this);
		    let rowString = '';
		    thisRow.each(function(){
		    	let self = $(this); // I know there is a better way of doing this, but I can't get it to work right now, so YOLO
		    	csvContent += this[0] + ',';
		    	csvContent += this[1] + ',';
		    	csvContent += this[2] + ',';
		    	csvContent += this[3] + ',';
		    	csvContent += this[4] + ',';
		    	csvContent += this[5] + ',';
		    });
		    csvContent += rowString + "\r\n";
		});
		var encodedUri = encodeURI(csvContent);
		window.open(encodedUri);
	})


	function fillMatcher(uploaded, stored){
		let newHTML = '';
		let matcherRow;
		$(uploaded).each(function(index){
			let myName = this;
			newHTML += `				
				<tr data-match-row>
					<td data-match-uploaded="`+myName+`" draggable="true">`+myName+`</td>
					<td data-match-new></td>
					<td data-match-req></td>
				</tr>
			`
		})
		$(document).find("[data-match-results]").html(`
			<table>
				<tr>
					<th>Uploaded</th>
					<th></th>
					<th>Required</th>
				</tr>
			`+newHTML+`
			</table>
		`);
		let rows = $(document).find("[data-match-row]");
		$(stored).each(function(i){
			let thisHeading = this;
			let thisReq = $(rows[i]).find('[data-match-req]');
			thisReq.html(thisHeading).attr('data-match-req', thisHeading);
			let thisNew = $(rows[i]).find('[data-match-new]');
			thisNew.html(thisHeading).attr('data-match-new', thisHeading);
		})
	};

	// handle click "MATCH DATA" button
	$(document).on('click touchend', '[data-match]', function(e){
		e.stopPropagation();
		e.preventDefault();
		// inactivate table
		let resultsJSON = []; 
		var regex = /^([a-zA-Z0-9\s_\\.\-:])+(.csv)$/;  
		//Checks whether the file is a valid csv file    
		if (regex.test($("[data-file-upload]").val().toLowerCase())) {
			//Checks whether the browser supports HTML5    
			if (typeof(FileReader) != "undefined") {  
				// rock and roll!
				var reader = new FileReader();
				let fileUpload = $("[data-file-upload]")[0].files[0];

				// process the file
				reader.readAsText(fileUpload); 


				reader.onload = function(e) {  
					//Splitting of Rows in the csv file    
					var csvrows = e.target.result.split("\n"); 
					var headings = csvrows[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); // put the first row into an array of headings	**USE REGEX TO ALLOW COMMAS IN CELL DATA				
					// clean up the headings
					$(headings).each(function(i){
						headings[i] = headings[i].trim();
					})

					try{
						fillMatcher(headings,requiredFields);
					}catch(error){
						errorAlert('failed to fill matcher');
					};
				}
				$(document).find(".match").addClass('is-visible');
			} else {  
				alert("Sorry! Your browser does not support HTML5!");  
			}  
		} else { 
			alert('please select a CSV file.');
		}
	})

	// handle click "SAVE MATCH" button
	$(document).on('click touchend', '[data-save-match]', function(e){
		e.preventDefault();
		e.stopPropagation();

		// get new headings
		let newHeadings = '';
		$(document).find("[data-match-new]").each(function(){
			let thisHeading = $(this);
			newHeadings += thisHeading.attr('data-match-new') + ','	;
		});

		// populate hidden element
		$(document).find("[data-headings]").attr('data-headings', newHeadings);

		// reset table
		let table = $(document).find('[data-results-output]');
		table.html(''); // clear table ready for new data

		// close modal
		$(document).find('.match').removeClass('is-visible');
	})


	// handle close matcher
	$(document).on('click touchend', '[data-close-match]', function(e){
		e.preventDefault();
		e.stopPropagation();

		$(document).find(".match").removeClass('is-visible');
	})

	// handle drag and drop
	let currentlyHeld = '';
	$(document).on('dragstart', '[data-match-uploaded]', function(e){
		let thisHeading = $(e.target).attr('data-match-uploaded');
		currentlyHeld = thisHeading;
	})

	$(document).on('drop', '[data-match-new], [data-match-req]', function(e){
		e.preventDefault();
		let thisTarget = $(e.target);
		let displayCell = '';
		if(thisTarget.attr('data-match-req')){ // if dropping directly on req cell
			displayCell = thisTarget.parent().find('[data-match-new]');
		}else{
			displayCell = thisTarget;
		}
		if(!displayCell.hasClass('is-active')){ // if not already filled
			displayCell.addClass('is-active').attr('data-match-new', currentlyHeld).text(currentlyHeld); // fill data-match-new
			$(document).find('[data-match-uploaded="'+currentlyHeld+'"]').text('').addClass('is-empty'); // empty data-match-uploaded
			currentlyHeld = '';
		}
	})

	$(document).on('dragover', '[data-match-new], [data-match-req]', function(e){
		e.preventDefault();
	})

	// handle click filled cell to revert
	$(document).on('click touchend', '[data-match-new].is-active', function(e){
		e.preventDefault();
		e.stopPropagation();
		let thisCell = $(this);
		let heading = thisCell.attr('data-match-new');
		let original = $(document).find('[data-match-uploaded="'+heading+'"]');
		// refill original
		original.removeClass('is-empty').text(heading);
		// deactivate data-match-new
		thisCell.removeClass('is-active');
		// refill with req
		let myReq = thisCell.parent().find('[data-match-req]').attr('data-match-req');
		thisCell.attr('data-match-new', myReq).text(myReq);

	})

	// display errors in DOM as they are captured
	function errorAlert(errorStep){
		progressBar.width('0%');
		$(document).find('[data-error-alert]').append(`
			<span>..${errorStep}..</span>
		`);
	}

})

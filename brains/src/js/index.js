var moment = require('moment'); // require for turning AU time into a workable format
var XLSX = require('xlsx'); // require for reading excel sheets

$(document).ready(function(){
	let progressBar = $("[data-progress-bar]");

	function exportToArray() { // create an array before exporting to HTML table

		// inactivate table
		let table = $(document).find('[data-results-output]');
		table.addClass('is-inactive');
		let resultsJSON = []; 
		var regex = /^([a-zA-Z0-9\s_\\.\-:])+(.csv)$/;  
		//Checks whether the file is a valid csv file    
		if (regex.test($("[data-file-upload]").val().toLowerCase())) {  
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
					fillMatcher(resultsJSON);
					filterDates(resultsJSON);
				}  
			} else {  
				alert("Sorry! Your browser does not support HTML5!");  
			}  
		} else { 
			alert('please select a CSV file.');
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

		// get the start and end dates
		let startDate = parseInt($(document).find('[data-start-date]').attr('data-date'));
		let endDate = parseInt($(document).find('[data-end-date]').attr('data-date'));

		// for each line item, except the first row of headings
		$(resultsJSON).each(function(index){
			let row = $(this);
			// filter out any rows outside the dates set above
			// get date
			let dateString = String(row[0]['due date (utc)']).trim();
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
		filterIrrelevant(resultsJSON);
	}

	function filterIrrelevant(resultsJSON) {
	
		// for each line item, except the first row of headings
		$(resultsJSON).each(function(index){
			let row = this;
			
			// blank grade
			if(row['grade'] == ''){
				delete resultsJSON[index];
			}

			// zero grade total
			if(row['grade total'] == 0){
				delete resultsJSON[index];
			}

			// submission type
			if(row['submission type'] == ('"[""none""]"')){
				delete resultsJSON[index];
			}

			// assessment name
			if(row['assessment name'] == ('OPELA' || 'considerations')){
				delete resultsJSON[index];
			}
		})
		mergeStudent(resultsJSON);
	}

	function mergeStudent(resultsJSON){
		// all rows with the same email address become a set of results for a student
		let emailArray = [];
		$(resultsJSON).each(function(index){
			let row = this;
			// clear any "deleted" rows from before
			if(row['email address'] === undefined){
				resultsJSON.slice(index, 1);
			}else{
				emailArray.push(row['email address']); // for unique array of names
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
				let email = String(row["email address"]);
				let studentID = String(row["student id"]);
				if(email == thisEmail){
					thisStudent['results'].push(row);
					thisStudent['student id'] = studentID;
				}
			})	
			mergedArray.push(thisStudent);
		})
		calcResults(mergedArray);
	}

	function calcResults(mergedArray){
		// for each student
		$(mergedArray).each(function(){
			let thisStudent = this;
			let thisTotalGrade = 0;
			let thisTotalGradeTotal = 0;
			let numPass = 0; // count how many passed assessments, so we can work out the percentage overall
			// for each result
			$(thisStudent["results"]).each(function(){
				let thisResult = this;
				let thisGrade = parseInt(thisResult['grade']);
				let thisGradeTotal = parseInt(thisResult['grade total']);
				if(thisResult['grade'].indexOf('%') != -1){ // if it is a percent, calculate the grade
					thisGrade = (thisGradeTotal / 100) * thisGrade;
					thisResult['grade'] = thisGrade;
				}
				
				// calc pass / fail
				if((thisGrade < (thisGradeTotal / 2)) || (thisResult['submission state'] == 'unsubmitted') || (thisResult['grade'] == 'incomplete')){
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

		processTable(mergedArray);
	}

	function returnName(email){
		let emailStart = email.split('@')[0];
		let parts = emailStart.split('.');
		let fullName = parts.join(' ');
		return fullName;
	}

	function processTable(data){
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
				if(thisResult['submitted date (utc)'].length >= 4){ // >= 4 in case it is just an empty line ending booger
					dateSubmitted = new Date(thisResult['submitted date (utc)'].split('\r')[0]); //.split('\r')[0] to clean up boogers from line endings
					dateSubmitted = dateSubmitted.toLocaleDateString("en-GB");
				}else{
					dateSubmitted = 'no date';
				}
				if(thisResult['due date (utc)'].length >= 4){ // >= 4 in case it is just an empty line ending booger
					dateDue = new Date(thisResult['due date (utc)'].split('\r')[0]); //.split('\r')[0] to clean up boogers from line endings
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
		progressBar.width('10%').removeClass('is-finished');;
		setTimeout(function(){ // actually process a second after, so progress bar can show
			progressBar.width('15%');
			exportToArray();
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


	function fillMatcher(resultsJSON){
		$(resultsJSON).each(function(index){
			let row = $(this);
			// console.log(row[0]['email address']);
		})
	};

	// handle click "MATCH DATA" button
	$(document).on('click touchend', '[data-match]', function(e){
		e.stopPropagation();
		e.preventDefault();
		exportToArray();
	})

	function match(){
		$(document).find(".match").addClass('is-visible');
		// populate columns from CSV
	}

})

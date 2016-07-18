var assert = require('chai').assert;
var opkit = require('../index');
var alarms = new opkit.Alarms();
var sinon = require('sinon');
var AWS = require('aws-sdk-mock');
var Promise = require('bluebird');
var auth1 = new opkit.Auth();

var result;

describe('Alarms', function(){

	before(function() {
		auth1.updateRegion('narnia-1');
		auth1.updateAuthKeys('shiny gold one', 'old rusty one');
		AWS.mock('CloudWatch', 'describeAlarms', function(params, callback){
			callback(null, {
				MetricAlarms: [{
					StateValue : 'OK',
					MetricName : 'MetricName',
					AlarmDescription: 'AlarmDescription',
					Namespace : 'Namespace',
					AlarmName : 'AlarmName'
				}]
			});
		});
	});

	after(function() {
		AWS.restore('CloudWatch', 'describeAlarms');
	});

	describe('#queryAlarmsByState()', function(){
		before(function() {
			result = undefined;
			return alarms.queryAlarmsByState('OK', auth1)
			.then(function (data){
				result = data.MetricAlarms[0].StateValue;
			});
		});		
		it('Should result in an object with StateValue same as state given', function () {
			assert.equal(result, 'OK');
		});
	});
	describe('#queryAlarmsByStateReadably', function(){
		before(function () {
			result = undefined;
			return alarms.queryAlarmsByStateReadably('OK', auth1)
			.then(function (data){
				result = data;
			});
		});
		it('Should result in the correct human-readable string', function () {
			assert.isOk(result);
		});
	});
	describe('#countAlarmsByState', function(){
		before(function () {
			result = undefined;
			return alarms.countAlarmsByState('OK', auth1)
			.then(function (data){
				result = data;
			});
		});
		it('Should result in the number of alarms in the particular search', function () {
			assert.equal(result, 1);
		});
	});
	describe('#queryAlarmsByWatchlist()', function(){
		before(function() {
			result = undefined;
			return alarms.queryAlarmsByWatchlist(['AlarmName'], auth1)
			.then(function (data){
				result = data.MetricAlarms[0].AlarmName;
			});
		});		
		it('Should result in an object with AlarmName on the watchlist', function () {
			assert.equal(result, 'AlarmName');
		});
	});
	describe('#queryAlarmsByWatchlistReadably()', function(){
		before(function() {
			result = undefined;
			return alarms.queryAlarmsByWatchlistReadably(['AlarmName'], auth1)
			.then(function (data){
				result = data;
			});
		});		
		it('Should result in a neat string with the correct AlarmName', function () {
			assert.equal(result, '*OK*: AlarmName\n');
		});
	});
	describe('#queryAlarmsByPrefix()', function(){
		before(function() {
			result = undefined;
			return alarms.queryAlarmsByPrefix('Alarm', auth1)
			.then(function (data){
				result = data.MetricAlarms[0].AlarmName;
			});
		});		
		it('Should result in an object with AlarmName that starts with prefix', function () {
			assert.equal(result, 'AlarmName');
		});
	});
	describe('#queryAlarmsByPrefixReadably()', function(){
		before(function() {
			result = undefined;
			return alarms.queryAlarmsByPrefixReadably('Alarm', auth1)
			.then(function (data){
				result = data;
			});
		});		
		it('Should result in a neat string with the correct AlarmName', function () {
			assert.equal(result, '*OK*: AlarmName\n');
		});
	});
	describe('#getAllAlarms with an ignore list', function(){
		before(function() {
			result = undefined;
			return alarms.getAllAlarms(auth1, {}, ['AlarmName'])
			.then(function (data){
				result = data;
			})
		});
		it('Should retrieve no results', function () {
			assert.isOk(result);
		});
	});
	describe('#getAllAlarms ignore a non-existent alarm', function(){
		before(function() {
			result = undefined;
			return alarms.getAllAlarms(auth1, {}, ['SomeOtherAlarm'])
			.then(function (data){
				result = data;
			});
		});
		it('Should retrieve no results', function () {
			assert.isOk(result);
		});
	});
});
describe('Alarms', function(){
	describe('#healthReportByState', function(){

		after(function() {
			AWS.restore('CloudWatch', 'describeAlarms');
		});

		before(function () {
			AWS.mock('CloudWatch', 'describeAlarms', function(params, callback){
				callback(null, {
					MetricAlarms: [{
						StateValue : 'OK',
						MetricName : 'MetricName',
						AlarmDescription: 'AlarmDescription',
						Namespace : 'Namespace',
						AlarmName : 'AlarmNamey'
					}
						,
					{
						StateValue : 'INSUFFICIENT_DATA',
						MetricName : 'MetricName',
						AlarmDescription: 'AlarmDescription',
						Namespace : 'Namespace',
						AlarmName : 'AlarmName'
					}
						,
					{
						StateValue : 'ALARM',
						MetricName : 'MetricName',
						AlarmDescription: 'AlarmDescription',
						Namespace : 'Namespace',
						AlarmName : 'AlarmName'
					}]
				});
			});
			result = undefined;
			return alarms.healthReportByState(auth1)
			.then(function (data){
				result = data;
			});
		});
		it('Should result in a correct health report', function () {
			assert.equal(result, "*Number Of Alarms, By State:* \n"+
			"There are "+'*1*'+" OK alarms, \n"+
			"          "+'*1*'+ " alarming alarms, and \n"+
			"          "+'*1*'+" alarms for which there is insufficient data.");
		});
	});
});
describe('Alarms Paginated Response', function() {

	after(function() {
		AWS.restore('CloudWatch', 'describeAlarms');
	});

	before(function() {
		AWS.mock('CloudWatch', 'describeAlarms', function(params, callback){
			if (!params.NextToken) {
				callback(null, {
					MetricAlarms: [{
						StateValue : 'OK',
						MetricName : 'MetricName',
						AlarmDescription: 'AlarmDescription',
						Namespace : 'Namespace',
						AlarmName : 'AlarmName'
					}],
					NextToken : 'next'
				});
			} else {
				callback(null, {
					MetricAlarms: [{
						StateValue : 'OK',
						MetricName : 'MetricName2',
						AlarmDescription: 'AlarmDescription2',
						Namespace : 'Namespace2',
						AlarmName : 'AlarmName2'
					}],
				});
			}
		});
		result = undefined;
		return alarms.getAllAlarms(auth1)
		.then(function(data) {
			result = data;
		});
	});

	it('Should properly retrieve the alarms', function() {
		assert.isOk(result);
	});
});
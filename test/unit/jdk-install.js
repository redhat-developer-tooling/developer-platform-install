import { expect } from 'chai';
import InstallerDataService from '../../browser/services/data';
import JdkInstall from '../../browser/model/jdk-install';

let sinon = require('sinon');

describe('JDK installer', function() {
	let sandbox, fakeProgress, fs, DataStub, stub;
	DataStub = sinon.spy(function() {
		return sinon.createStubInstance(InstallerDataService);
	});
	stub = new DataStub();
	stub.tempDir.returns('temp');
	stub.installDir.returns('install');
	
	before(function () {
	    sandbox = sinon.sandbox.create();
	    
	    fakeProgress = { setDesc: function (desc) { return; } };
		fs = require('fs');
		sinon.stub(fs, 'createWriteStream').returnsThis();
	});

	after(function () {
	    sandbox.restore();
	});
	
	it('should not download jdk when an installation exists', function() {
		let jdk = new JdkInstall(stub, 'url', 'file');	
		expect(jdk.useDownload).to.equal(false);
	});
	
	it('should fail when no url is set and no installation exists', function() {
		expect(function() {
			new JdkInstall(stub, null, null);
		}).to.throw('No download URL set');
		
		expect(function() {
			new JdkInstall(stub, '', null);
		}).to.throw('No download URL set');
	});
	
	it('should download jdk when no installation is found', function() {
		expect(new JdkInstall(stub, 'url', null).useDownload).to.equal(true);
	});
	
	it('should download jdk installer to temporary folder as jdk8.zip', function() { 
		expect(new JdkInstall(stub, 'url', null).downloadedFile).to.equal('temp/jdk8.zip');
	});
	
	describe('when downloading the jdk zip', function() {
		
		it('should fail with an invalid url', function(done) {
			function failsWithInvalidUrl() {
				let installer = new JdkInstall(stub, 'url', null);
				installer.downloadInstaller(fakeProgress, 
					function() { return success(); }, function() {});
			}			
			expect(failsWithInvalidUrl).to.throw('Invalid URI "url"');
			done();
		});
	});
	
	describe('when installing jdk', function() {
		it('should fail with invalid install file name', function() {
			stub.installDir.returns('install');		
			let jdk = new JdkInstall(stub, 'url', 'file');
			
			expect(function() {jdk.install(fakeProgress, 
					function() { return success(); },
					function() {})}).to.throw('Invalid filename');
		});
		
	});
});

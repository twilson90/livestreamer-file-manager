import {WindowCommunicator} from "@hedgehog90/utils/dom";
// import "@hedgehog90/utils/dom/style.css"; // not necessary
import "./extra-style.scss";
$(async()=>{
	var is_iframe = window.self !== window.top;
	var params = new URLSearchParams(window.location.search);
	var id = params.get("id");
	// var key = params.get("key");

	var parent_window = window.opener || window.parent;
	var standalone = !id || window.location.hash;
	var connector_url = `./connector`
	console.log("standalone:", standalone)

	var defaultOpts = {
		url : connector_url,
		// cssAutoLoad : false,
		ui : ['toolbar', 'tree', 'path', 'stat'], /* 'places', */
		uiOptions: {
			toast : {
				defaults : {}
			},
			toolbar:[
				['home'],
				// ['netmount'],
				['back', 'reload', 'forward'],
				['mkdir', 'mkfile', 'upload'],
				['open', 'download', 'info', 'quicklook'],
				['copy', 'cut', 'paste', 'rm', 'duplicate', 'rename', 'edit'],
				['extract', 'archive'],
				['search'],
				['view', 'sort'],
				['preference', 'help'],
				['getfile']
			],
			toolbarExtra: {
				defaultHides: [],
			},
			dialog:{
				focusOnMouseOver: false,
			},
			tree: {
				durations : {
					slideUpDown : 0.2,
					autoScroll : 0.2,
				}
			},
			cwd: {
				showSelectCheckboxUA: ['All']
			},
		},
		contextmenu : {
			// navbarfolder menu
			navbar : ['open', '|', 'copy', 'cut', 'paste', 'duplicate', '|', 'rm', '|', 'rename', 'info', 'downloadtree'],
			// current directory menu
			cwd    : ['reload', 'back', '|', 'upload', 'mkdir', 'mkfile', 'paste', '|', 'sort', '|', 'info', 'downloadtree'],
			// current directory file menu
			files  : ['getfile', '|', 'open', 'quicklook', '|', 'download', '|', 'copy', 'cut', 'paste', 'duplicate', '|', 'rm', '|', 'edit', 'rename', '|', 'archive', 'extract', '|', 'info', 'downloadtree']
		},
		// These name are 'size', 'aliasfor', 'path', 'link', 'dim', 'modify', 'perms', 'locked', 'owner', 'group', 'perm' and your custom info items label
		hideItems : ['aliasfor'],
		resizable: false,
		noResizeBySelf: true,
		height: "100%",
		useBrowserHistory: !is_iframe,
		enableAlways: true,
		uploadMaxChunkSize: 16 * 1024 * 1024,
		showFiles : 512,
		// selectHashes: params.get("selectHashes"),
		// startPathHash: params.get("startPathHash"),
		// showThreshold : 50,
		commandsOptions : {
			info: {
				showHashAlgorisms: []
			},
			edit : {
				extraOptions : {
					// set API key to enable Creative Cloud image editor
					// see https://console.adobe.io/
					creativeCloudApiKey : '',
					// browsing manager URL for CKEditor, TinyMCE
					// uses self location with the empty value
					managerUrl : ''
				}
			},
			quicklook : {
				// autoplay : true,
				// jplayer  : 'extensions/jplayer'

				// to enable CAD-Files and 3D-Models preview with sharecad.org
				sharecadMimes : ['image/vnd.dwg', 'image/vnd.dxf', 'model/vnd.dwf', 'application/vnd.hp-hpgl', 'application/plt', 'application/step', 'model/iges', 'application/vnd.ms-pki.stl', 'application/sat', 'image/cgm', 'application/x-msmetafile'],
				// to enable preview with Google Docs Viewer
				googleDocsMimes : ['application/pdf', 'image/tiff', 'application/vnd.ms-office', 'application/msword', 'application/vnd.ms-word', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/postscript', 'application/rtf'],
				// to enable preview with Microsoft Office Online Viewer
				// these MIME types override "googleDocsMimes"
				officeOnlineMimes : ['application/vnd.ms-office', 'application/msword', 'application/vnd.ms-word', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.oasis.opendocument.text', 'application/vnd.oasis.opendocument.spreadsheet', 'application/vnd.oasis.opendocument.presentation']
			}
		},
		// bootCalback calls at before elFinder boot up 
		bootCallback : function(_fm, extraObj) {
			var fm = _fm;
			fm.commands.downloadtree = function() {
				this.exec = function(hashes) {
					var dfds = hashes.map(hash=>{
						return fm.request({
							data : {cmd : 'listtree', targets : [hash]},
							notify : {type : 'listtree', cnt : hashes.length, hideCnt : hashes.length==1, msg : `Traversing file tree...`},
							cancel : true,
							preventDefault : true,
						})
					});
					return $.when(...dfds).done((...datas)=>{
						var lines = [];
						for (var i = 0; i < datas.length; i++) {
							for (var id of datas[i].ids) {
								lines.push(id);
							}
							if (i < datas.length-1) lines.push("-".repeat(64));
						}
						/* for (var data of datas) {
							const process = (node, parent=undefined, i=0, depth=-1)=>{
								lines.push("│  ".repeat(Math.max(depth,0)) + (parent ? (((i == parent.children.length-1) ? "└" : "├") + "─ ") : "") + node.name + (node.isdir?"/":""));
								if (node.children) node.children.forEach((n,i)=>process(n, node, i, depth+1));
							};
							data.trees.forEach(tree=>process(tree));
							lines.push("-".repeat(64));
						} */
						
						var text = lines.join(`\r\n`)
						var filename = `${hashes.map(h=>fm.file(h).name).join(", ")}.txt`;
						var file = new File([text], filename, {type:"text/plain;charset=utf-8"});
						saveAs(file);
					});
				};
				this.getstate = function(hashes) {
					var files = this.files(hashes);
					return (files.length && files.every(f=>f.mime==="directory")) ? 0 : -1;
				};
			}
			fm.commands.downloadtree.prototype = { forceLoad: true };
			fm.i18.en.messages['cmddownloadtree'] = 'Download tree listing';
			fm.resources.blink = function(elm, mode) {
				var acts = {
					slowonce : function(){elm.hide().delay(250).fadeIn(750).delay(500).fadeOut(3500);},
					lookme   : function(){elm.show().fadeIn(250);}
				}, func;
				mode = mode || 'slowonce';
				func = acts[mode] || acts['lookme'];
				elm.stop(true, true);
				func();
			}

			/* any bind functions etc. */
			fm.bind('init', function() {
				var elem = fm.getUI()[0];
				elem.classList.remove("elfinder-touch");
				elem.classList.remove("elfinder-mobile");
			});
			
			// for example set document.title dynamically.
			var title = document.title;
			var last_cwd;
			fm.bind('open', function() {
				var path = '', cwd = fm.cwd();
				if (!last_cwd) last_cwd = cwd;
				if (cwd) {
					path = fm.path(cwd.hash) || null;
				}
				// document.title = path ? path + ' - ' + title : title;
				document.title = `File Manager - ${path}`;
				if (cwd != last_cwd) {
					delete fm.options.selectHashes;
				}
				last_cwd = cwd;
			}).bind('destroy', function() {
				document.title = title;
			});
			
			fm.bind("load", function() {
				fm.bind('cwdrender', function() {
					requestAnimationFrame(()=>{
						if (fm.options.selectHashes) {
							var top = Number.MAX_SAFE_INTEGER;
							var highest_elem;
							for (var i=0; i<fm.options.selectHashes.length; i++) {
								var hash = fm.options.selectHashes[i];
								var $item = fm.cwdHash2Elm(hash);
								if (!$item[0]) continue;
								if ($item[0].offsetTop < top) {
									top = $item[0].offsetTop;
									highest_elem = $item[0];
								}
								var e = $.Event("click");
								e.ctrlKey = i != 0;
								$item.trigger(e);
							}
							if (highest_elem) {
								setTimeout(()=>highest_elem.scrollIntoView({block:"center"}, 100));
							}
							fm.enable();
						}
					});
				});
			});
		},
	};
	var opts = {};
	if (!standalone) {
		var messenger = new WindowCommunicator();
		opts = (await messenger.request(parent_window, "elfinder_options", id));
		// console.log("elfinder_options received:", opts);
		if (Array.isArray(opts.fileFilter)) {
			var fileFilter = opts.fileFilter;
			opts.fileFilter = (file)=>{
				for (var f of fileFilter) {
					var m;
					if (m = f.match(/^\.\w+$/)) {
						if (file.name.endsWith(m[0])) return true;
					} else {
						var mime = f.split("/");
						if (file.mime === f || (mime[1] == "*" && file.mime.split("/")[0] == mime[0])) return true;
					}
				}
				return false;
			}
		}
		if (opts.getFileCallback === true) {
			opts.getFileCallback = (files)=>{
				if (!Array.isArray(files)) files = [files];
				messenger.request(window.parent, "files", {files, id})
			};
		}
	}

	opts = $.extend(true, defaultOpts, opts);
	console.log(opts);
	$('#elfinder').elfinder(opts);
});
// for cv.js services:
//  * we need cv in global namespace
//  * cv.js also needs to resolve cv.data
window.locateFile = function(file)
{
	console.log("cv locate file: " + file);
	if(file == "cv.data")
		return "/nih/opencv/uv4l/cv.data";
};
window.setStatus = function(s)
{
    console.log("cv status: " + s);
};
window.onRuntimeInitialized = function(args)
{
    console.log("cv onruntimeinitialized: " + args);
};
window.Module = window;
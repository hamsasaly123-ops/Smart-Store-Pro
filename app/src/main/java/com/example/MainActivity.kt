package com.example

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.Context
import android.os.Bundle
import android.print.PrintAttributes
import android.print.PrintManager
import android.util.Log
import android.view.View
import android.webkit.ConsoleMessage
import android.webkit.JavascriptInterface
import android.webkit.JsPromptResult
import android.webkit.JsResult
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.EditText
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import java.io.File

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Ensure WebView code cache directories exist to prevent chromium simple_file_enumerator / simple_index_file errors
        try {
            File(cacheDir, "WebView/Default/HTTP Cache/Code Cache/js").mkdirs()
            File(cacheDir, "WebView/Default/HTTP Cache/Code Cache/wasm").mkdirs()
        } catch (e: Exception) {
            Log.w("MainActivity", "Failed creating WebView cache directories", e)
        }

        webView = WebView(this).apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                allowFileAccess = true
                allowContentAccess = true
                cacheMode = WebSettings.LOAD_DEFAULT
                useWideViewPort = true
                loadWithOverviewMode = true
                displayZoomControls = false
                builtInZoomControls = false
                mediaPlaybackRequiresUserGesture = false
            }

            // Default layer type (no forced hardware layer texture) avoids MESA rendernode errors
            setLayerType(View.LAYER_TYPE_NONE, null)

            webViewClient = object : WebViewClient() {
                override fun onReceivedError(
                    view: WebView?,
                    errorCode: Int,
                    description: String?,
                    failingUrl: String?
                ) {
                    super.onReceivedError(view, errorCode, description, failingUrl)
                    Log.e("SmartStore", "WebView error ($errorCode): $description on $failingUrl")
                }
            }

            webChromeClient = object : WebChromeClient() {
                override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean {
                    Log.d("SmartStoreJS", "${consoleMessage.message()} -- line ${consoleMessage.lineNumber()} of ${consoleMessage.sourceId()}")
                    return true
                }

                override fun onJsAlert(view: WebView?, url: String?, message: String?, result: JsResult?): Boolean {
                    AlertDialog.Builder(this@MainActivity)
                        .setTitle("SmartStore Pro")
                        .setMessage(message)
                        .setPositiveButton(android.R.string.ok) { _, _ -> result?.confirm() }
                        .setOnCancelListener { result?.cancel() }
                        .show()
                    return true
                }

                override fun onJsConfirm(view: WebView?, url: String?, message: String?, result: JsResult?): Boolean {
                    AlertDialog.Builder(this@MainActivity)
                        .setTitle("تأكيد")
                        .setMessage(message)
                        .setPositiveButton("نعم") { _, _ -> result?.confirm() }
                        .setNegativeButton("إلغاء") { _, _ -> result?.cancel() }
                        .setOnCancelListener { result?.cancel() }
                        .show()
                    return true
                }

                override fun onJsPrompt(view: WebView?, url: String?, message: String?, defaultValue: String?, result: JsPromptResult?): Boolean {
                    val input = EditText(this@MainActivity)
                    input.setText(defaultValue ?: "")
                    AlertDialog.Builder(this@MainActivity)
                        .setTitle("إدخال")
                        .setMessage(message)
                        .setView(input)
                        .setPositiveButton("موافق") { _, _ -> result?.confirm(input.text.toString()) }
                        .setNegativeButton("إلغاء") { _, _ -> result?.cancel() }
                        .setOnCancelListener { result?.cancel() }
                        .show()
                    return true
                }
            }

            addJavascriptInterface(WebAppInterface(this@MainActivity, this), "AndroidBridge")

            loadUrl("file:///android_asset/index.html")
        }

        setContentView(webView)

        ViewCompat.setOnApplyWindowInsetsListener(webView) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    webView.evaluateJavascript("if (window.handleAndroidBack) { window.handleAndroidBack(); } else { false; }") { result ->
                        if (result == "false" || result == "null") {
                            isEnabled = false
                            onBackPressedDispatcher.onBackPressed()
                        }
                    }
                }
            }
        })
    }

    class WebAppInterface(private val context: Context, private val webView: WebView) {
        @JavascriptInterface
        fun printInvoice(jobName: String) {
            webView.post {
                val printManager = context.getSystemService(Context.PRINT_SERVICE) as? PrintManager
                val printAdapter = webView.createPrintDocumentAdapter(jobName)
                printManager?.print(jobName, printAdapter, PrintAttributes.Builder().build())
            }
        }
    }
}


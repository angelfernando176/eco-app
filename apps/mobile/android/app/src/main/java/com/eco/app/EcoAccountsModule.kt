package com.eco.app

import android.Manifest
import android.accounts.Account
import android.accounts.AccountManager
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener

private val EMAIL_REGEX = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")
private const val GET_ACCOUNTS_REQUEST_CODE = 9201

class EcoAccountsModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "EcoAccountsModule"

  @ReactMethod
  fun getDeviceEmail(promise: Promise) {
    try {
      if (hasGetAccountsPermission()) {
        promise.resolve(findDeviceEmail())
        return
      }
      requestGetAccountsPermission(promise)
    } catch (e: Exception) {
      promise.resolve(null)
    }
  }

  private fun hasGetAccountsPermission(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true
    val context = reactApplicationContext
    return ContextCompat.checkSelfPermission(context, Manifest.permission.GET_ACCOUNTS) ==
      PackageManager.PERMISSION_GRANTED
  }

  private fun requestGetAccountsPermission(promise: Promise) {
    val activity = currentActivity
    if (activity !is PermissionAwareActivity) {
      promise.resolve(null)
      return
    }
    try {
      activity.requestPermissions(
        arrayOf(Manifest.permission.GET_ACCOUNTS),
        GET_ACCOUNTS_REQUEST_CODE,
        PermissionListener { requestCode, _, grantResults ->
          if (requestCode == GET_ACCOUNTS_REQUEST_CODE &&
            grantResults.isNotEmpty() &&
            grantResults[0] == PackageManager.PERMISSION_GRANTED
          ) {
            promise.resolve(findDeviceEmail())
          } else {
            promise.resolve(null)
          }
          true
        }
      )
    } catch (e: Exception) {
      promise.resolve(null)
    }
  }

  private fun findDeviceEmail(): String? {
    return try {
      val accountManager = AccountManager.get(reactApplicationContext)
      val accounts: Array<Account> = accountManager.accounts
      accounts
        .filter { it.type == "com.google" && EMAIL_REGEX.matches(it.name) }
        .map { it.name }
        .firstOrNull()
        ?: accounts.filter { EMAIL_REGEX.matches(it.name) }.map { it.name }.firstOrNull()
    } catch (e: Exception) {
      null
    }
  }
}

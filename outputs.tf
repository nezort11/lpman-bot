output "lpman_bot_code_bucket" {
  value = yandex_storage_bucket.lpman-bot-code.id
}

output "lpman_bot_gateway_domain" {
  value = yandex_api_gateway.lpman-bot-function-gateway.domain
}

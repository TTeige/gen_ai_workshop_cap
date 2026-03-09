package no.vegvesen.vu.effekt.shared_expense_backend

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class SharedExpenseBackendApplication

fun main(args: Array<String>) {
    runApplication<SharedExpenseBackendApplication>(*args)
}

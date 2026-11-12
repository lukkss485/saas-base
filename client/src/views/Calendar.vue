<template>
  <div class="calendar-page relative isolate space-y-5 sm:space-y-6">
    <header class="calendar-reveal calendar-reveal--header flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div class="min-w-0 space-y-1">
        <div class="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-primary">
          <CalendarDays class="h-4 w-4" />
          Planejamento
        </div>
        <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">Calendário</h1>
        <p class="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Visualize o mês inteiro, acompanhe os prazos e organize suas tarefas por dia.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" class="h-11 rounded-full px-4" aria-label="Exportar tarefas do mês em .ics" @click="exportMonthIcs">
          <Download class="h-4 w-4" />
          <span class="hidden sm:inline">Exportar .ics</span>
        </Button>
        <div class="calendar-glass-control flex items-center gap-1 rounded-full border border-white/60 bg-background/75 p-1 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-card/75">
          <Button type="button" variant="ghost" size="icon" class="group h-9 w-9 rounded-full transition-transform duration-200 active:scale-90 motion-reduce:transform-none" aria-label="Mês anterior" @click="shiftMonth(-1)">
            <ChevronLeft class="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5 motion-reduce:transform-none" />
          </Button>
          <Button type="button" variant="ghost" size="sm" class="h-9 rounded-full px-4 font-medium" @click="goToday">Hoje</Button>
          <Button type="button" variant="ghost" size="icon" class="group h-9 w-9 rounded-full transition-transform duration-200 active:scale-90 motion-reduce:transform-none" aria-label="Próximo mês" @click="shiftMonth(1)">
            <ChevronRight class="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transform-none" />
          </Button>
        </div>
      </div>
    </header>

    <section class="grid gap-3 sm:grid-cols-3" aria-label="Resumo do calendário">
      <Card
        v-for="(card, index) in summaryCards"
        :key="card.kind"
        :style="{ animationDelay: `${index * 65}ms` }"
        role="button"
        tabindex="0"
        :aria-label="`${card.label}: ${card.value}. Ver lista`"
        class="calendar-surface calendar-summary-card calendar-reveal cursor-pointer rounded-3xl border-border/60 py-0 shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transform-none"
        :class="card.hover"
        @click="openList(card.kind)"
        @keydown.enter.prevent="openList(card.kind)"
        @keydown.space.prevent="openList(card.kind)"
      >
        <CardContent class="flex items-center gap-3 p-4">
          <span class="grid h-10 w-10 place-items-center rounded-2xl" :class="card.tone">
            <component :is="card.icon" class="h-5 w-5" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-xs text-muted-foreground">{{ card.label }}</p>
            <Transition name="calendar-number" mode="out-in">
              <p :key="card.value" class="text-xl font-semibold tabular-nums">{{ card.value }}</p>
            </Transition>
          </div>
          <ArrowRight class="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </CardContent>
      </Card>
    </section>

    <!-- Busca e filtros: afetam a grade, o dia selecionado e as tarefas sem data -->
    <section class="calendar-reveal calendar-reveal--filters flex flex-col gap-2 lg:flex-row lg:items-center" aria-label="Busca e filtros">
      <div class="relative min-w-0 flex-1 lg:max-w-xs">
        <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          v-model="search"
          type="search"
          placeholder="Buscar tarefas..."
          aria-label="Buscar tarefas no calendário"
          class="h-10 rounded-2xl border-border/60 bg-background/70 pl-9"
          @keydown.esc="search = ''"
        />
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <div class="flex gap-1 rounded-2xl bg-muted p-1" role="group" aria-label="Filtrar por situação">
          <Button
            v-for="option in STATUS_OPTIONS"
            :key="option.value"
            type="button"
            variant="ghost"
            size="sm"
            class="h-8 rounded-xl px-3 text-xs"
            :class="segClass(statusFilter === option.value)"
            :aria-pressed="statusFilter === option.value"
            @click="statusFilter = option.value"
          >
            {{ option.label }}
          </Button>
        </div>

        <div class="flex gap-1 rounded-2xl bg-muted p-1" role="group" aria-label="Filtrar por prioridade">
          <Button
            v-for="option in PRIORITY_FILTERS"
            :key="option.value"
            type="button"
            variant="ghost"
            size="sm"
            class="h-8 gap-1.5 rounded-xl px-3 text-xs"
            :class="segClass(priorityFilter === option.value)"
            :aria-pressed="priorityFilter === option.value"
            @click="priorityFilter = option.value"
          >
            <span v-if="option.value !== 'all'" class="h-2 w-2 rounded-full" :class="PRIORITY_DOT[option.value as Priority]" aria-hidden="true" />
            {{ option.label }}
          </Button>
        </div>

        <Transition name="calendar-control">
          <Button v-if="hasActiveFilters" type="button" variant="ghost" size="sm" class="h-9 rounded-2xl px-3 text-xs" @click="clearFilters">
            <X class="h-3.5 w-3.5" /> Limpar
          </Button>
        </Transition>
      </div>
    </section>

    <div class="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(19rem,0.8fr)]">
      <!-- Calendário mensal -->
      <Card class="calendar-surface calendar-reveal calendar-reveal--calendar min-w-0 overflow-hidden rounded-[2.25rem] border border-white/60 bg-card/95 py-0 shadow-[0_18px_48px_-28px_rgba(15,23,42,0.28)] dark:border-white/10">
        <CardHeader class="space-y-3 border-b border-border/50 px-3 py-4 sm:px-5 sm:py-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="min-w-0">
              <Transition name="calendar-month-label" mode="out-in">
              <CardTitle :key="monthKey" class="text-lg capitalize sm:text-xl">{{ monthLabel }}</CardTitle>
            </Transition>
              <CardDescription class="mt-1">Selecione uma data para ver ou adicionar tarefas.</CardDescription>
            </div>
            <span class="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground">
              <span class="h-2 w-2 rounded-full bg-primary" />
              {{ monthTaskCount }} {{ monthTaskCount === 1 ? 'tarefa' : 'tarefas' }}
            </span>
          </div>
          <div class="grid grid-cols-7 gap-1 text-center sm:gap-2" aria-hidden="true">
            <span v-for="weekday in WEEKDAYS" :key="weekday" class="py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:py-2 sm:text-xs">
              <span class="sm:hidden">{{ weekday.slice(0, 1) }}</span>
              <span class="hidden sm:inline">{{ weekday }}</span>
            </span>
          </div>
        </CardHeader>

        <CardContent class="relative p-2 sm:p-3">
          <Transition :name="monthTransitionName" mode="out-in">
            <div :key="monthKey" class="calendar-month-grid grid grid-cols-7 gap-1 sm:gap-2" role="group" aria-label="Dias do mês" @keydown="onGridKeydown">
            <button
              v-for="day in calendarDays"
              :key="day.key"
              type="button"
              :data-day="day.key"
              :tabindex="focusableKey === day.key ? 0 : -1"
              class="calendar-day group relative flex min-h-[4.6rem] min-w-0 flex-col items-center gap-1 overflow-hidden rounded-2xl border p-1 text-center outline-none transition-[color,background-color,border-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-px hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:min-h-[7.25rem] sm:items-stretch sm:rounded-3xl sm:p-2 motion-reduce:transform-none motion-reduce:transition-none"
              :class="[
                selectedDate === day.key
                  ? 'border-primary/25 bg-primary text-primary-foreground shadow-md shadow-primary/15'
                  : day.isToday
                    ? 'border-primary/35 bg-primary/[0.07] text-foreground'
                    : day.isCurrentMonth
                      ? 'border-border/45 bg-background/55 text-foreground hover:border-primary/25 hover:bg-primary/[0.035]'
                      : 'border-transparent bg-muted/20 text-muted-foreground/60 hover:bg-muted/45',
                dragOverKey === day.key ? 'ring-2 ring-primary/60 ring-offset-2' : '',
              ]"
              :aria-pressed="selectedDate === day.key"
              :aria-current="day.isToday ? 'date' : undefined"
              :aria-label="`${day.weekday}, ${day.day} de ${day.month}${day.tasks.length ? `, ${day.tasks.length} ${day.tasks.length === 1 ? 'tarefa' : 'tarefas'}` : ', sem tarefas'}${day.important ? ', dia importante' : ''}`"
              @click="selectDate(day.key)"
              @dragover="onDayDragOver(day.key, $event)"
              @dragleave="onDayDragLeave($event)"
              @drop="onDayDrop(day.key, $event)"
            >
              <span class="flex w-full items-center justify-center sm:justify-between">
                <span
                  class="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums transition-colors duration-300 sm:h-8 sm:w-8 sm:text-sm"
                  :class="day.isToday && selectedDate !== day.key ? 'bg-primary text-primary-foreground' : selectedDate === day.key ? 'bg-primary-foreground/15' : ''"
                >
                  {{ day.day }}
                </span>
                <Star v-if="day.important" class="hidden h-3.5 w-3.5 shrink-0 fill-current text-rose-400 sm:block" aria-hidden="true" />
              </span>

              <!-- Mobile: pontos + contador no fluxo normal (sem sobreposição). -->
              <span class="flex min-h-[1.25rem] items-center justify-center gap-1 sm:hidden" aria-hidden="true">
                <span v-for="task in day.tasks.slice(0, 3)" :key="task.id" class="h-1.5 w-1.5 rounded-full"
                  :class="selectedDate === day.key ? 'bg-primary-foreground/80' : task.done ? 'bg-muted-foreground/40' : PRIORITY_DOT[task.priority]" />
                <span v-if="day.tasks.length > 3" class="text-[9px] font-semibold tabular-nums"
                  :class="selectedDate === day.key ? 'text-primary-foreground/80' : 'text-muted-foreground'">
                  +{{ day.tasks.length - 3 }}
                </span>
              </span>

              <!-- Desktop: nomes das tarefas -->
              <TransitionGroup
                tag="span"
                name="calendar-task-chip"
                class="calendar-day-tasks relative hidden min-w-0 flex-1 flex-col items-stretch gap-1 overflow-hidden sm:flex"
              >
                <span v-for="task in day.tasks.slice(0, 3)" :key="task.id"
                  class="calendar-task-chip-item flex min-w-0 items-center gap-1 rounded-lg px-1.5 py-1 text-left text-[10px] leading-tight"
                  :class="selectedDate === day.key ? 'bg-primary-foreground/15 text-primary-foreground' : task.done ? 'bg-muted/45 text-muted-foreground line-through' : 'bg-muted/55 text-foreground'">
                  <span class="h-1.5 w-1.5 shrink-0 rounded-full"
                    :class="selectedDate === day.key ? 'bg-primary-foreground/80' : task.done ? 'bg-muted-foreground/40' : PRIORITY_DOT[task.priority]" />
                  <span class="truncate">{{ task.title }}</span>
                </span>
                <span v-if="day.tasks.length > 3" key="more" class="calendar-task-chip-item px-1.5 text-left text-[10px] font-medium text-muted-foreground"
                  :class="selectedDate === day.key ? 'text-primary-foreground/80' : ''">
                  +{{ day.tasks.length - 3 }} mais
                </span>
              </TransitionGroup>
            </button>
            </div>
          </Transition>

          <div v-if="tasksLoading" class="absolute inset-2 z-10 grid place-items-center rounded-3xl bg-background/75 backdrop-blur-sm sm:inset-3" role="status" aria-live="polite">
            <div class="flex items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-2.5 text-sm text-muted-foreground shadow-sm">
              <LoaderCircle class="h-4 w-4 animate-spin text-primary" /> Carregando calendário...
            </div>
          </div>

          <div class="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border/50 px-1 pt-3 text-[11px] text-muted-foreground sm:text-xs">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span class="inline-flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-primary" /> Hoje</span>
              <span class="inline-flex items-center gap-1.5"><Star class="h-3 w-3 fill-current text-rose-400" /> Dia importante</span>
            </div>
            <span class="hidden sm:inline">Setas: dia · PgUp/PgDn: mês · T: hoje · N: nova tarefa</span>
            <span>Começa na segunda-feira</span>
          </div>
        </CardContent>
      </Card>

      <!-- Detalhes do dia selecionado -->
      <div class="grid min-w-0 gap-4">
        <Card class="calendar-surface calendar-reveal calendar-reveal--details min-w-0 overflow-hidden rounded-[2.25rem] border border-white/60 bg-card/95 py-0 shadow-[0_18px_48px_-28px_rgba(15,23,42,0.28)] dark:border-white/10 xl:sticky xl:top-4">
          <CardHeader class="border-b border-border/50 bg-gradient-to-br from-primary/[0.09] via-background/35 to-transparent px-4 py-5 sm:px-5">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <CardDescription class="text-xs font-semibold uppercase tracking-[0.14em]">Dia selecionado</CardDescription>
                <Transition name="calendar-date-label" mode="out-in">
                  <CardTitle :key="selectedDate" class="mt-1 text-lg capitalize">{{ selectedDateLabel }}</CardTitle>
                </Transition>
                <p class="mt-1 text-sm text-muted-foreground">{{ selectedDateTasks.length }} {{ selectedDateTasks.length === 1 ? 'tarefa' : 'tarefas' }} nesta data</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                class="h-9 w-9 shrink-0 rounded-2xl"
                :aria-label="isSelectedDateImportant ? 'Desmarcar dia importante' : 'Marcar dia importante'"
                :aria-pressed="isSelectedDateImportant"
                :disabled="setImportant.isPending.value || importantQuery.isPending.value || importantQuery.isError.value"
                @click="toggleImportant(selectedDate)"
              >
                <Star class="h-4 w-4 transition-transform duration-300" :class="isSelectedDateImportant ? 'scale-110 fill-current text-rose-500' : 'text-muted-foreground'" />
              </Button>
            </div>
          </CardHeader>

          <CardContent class="space-y-4 p-4 sm:p-5">
            <form class="space-y-2" @submit.prevent="addTaskOnSelectedDate">
              <div class="flex gap-2">
                <Input
                  id="calendar-task-title"
                  v-model="draft"
                  maxlength="200"
                  placeholder="Adicionar uma tarefa..."
                  aria-label="Título da nova tarefa"
                  class="h-11 min-w-0 rounded-2xl border-border/60 bg-background/70 px-3.5 shadow-sm"
                />
                <Button
                  type="submit"
                  size="icon"
                  class="h-11 w-11 shrink-0 rounded-2xl shadow-sm"
                  aria-label="Adicionar tarefa"
                  :disabled="!draft.trim() || createTask.isPending.value"
                >
                  <LoaderCircle v-if="createTask.isPending.value" class="h-4 w-4 animate-spin" />
                  <Plus v-else class="h-4 w-4" />
                </Button>
              </div>

              <div class="flex flex-wrap items-center gap-1" role="radiogroup" aria-label="Prioridade da nova tarefa">
                <span class="mr-1 text-xs text-muted-foreground">Prioridade</span>
                <Button
                  v-for="p in PRIORITY_ORDER"
                  :key="p"
                  type="button"
                  size="sm"
                  variant="ghost"
                  role="radio"
                  class="h-8 gap-1.5 rounded-xl px-2.5 text-xs"
                  :class="newPriority === p ? 'bg-muted text-foreground' : 'text-muted-foreground'"
                  :aria-checked="newPriority === p"
                  @click="newPriority = p"
                >
                  <span class="h-2 w-2 rounded-full" :class="PRIORITY_DOT[p]" aria-hidden="true" />
                  {{ priorityLabel(p) }}
                </Button>
              </div>
            </form>

            <div v-if="tasksLoading" class="space-y-2" aria-label="Carregando tarefas">
              <Skeleton v-for="index in 3" :key="index" class="h-[4.25rem] w-full rounded-2xl" />
            </div>

            <div v-else-if="tasksError" class="rounded-3xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-center" role="alert">
              <p class="text-sm font-medium">Não foi possível carregar as tarefas.</p>
              <Button type="button" variant="outline" size="sm" class="mt-3 rounded-2xl" @click="() => refetchTasks()">
                Tentar novamente
              </Button>
            </div>

            <div v-else-if="!selectedDateTasks.length" class="rounded-3xl border border-dashed border-border/70 bg-muted/15 px-4 py-7 text-center">
              <span class="mx-auto grid h-10 w-10 place-items-center rounded-3xl bg-primary/10 text-primary"><CalendarDays class="h-5 w-5" /></span>
              <p class="mt-3 text-sm font-medium">{{ hasActiveFilters ? 'Nada por aqui com esses filtros' : 'Dia livre' }}</p>
              <p class="mt-1 text-xs leading-5 text-muted-foreground">
                {{ hasActiveFilters ? 'Ajuste ou limpe os filtros para ver as outras tarefas desta data.' : 'Adicione uma tarefa acima para começar a planejar esta data.' }}
              </p>
              <Button v-if="hasActiveFilters" type="button" variant="outline" size="sm" class="mt-3 rounded-2xl" @click="clearFilters">
                Limpar filtros
              </Button>
            </div>

            <!-- relative: necessário para a animação de saída (position: absolute) -->
            <TransitionGroup v-else tag="ul" name="calendar-task" class="relative space-y-2">
              <li
                v-for="task in selectedDateTasks"
                :key="task.id"
                :draggable="editingId !== task.id"
                class="task-row group flex min-w-0 items-center gap-2.5 rounded-2xl border border-border/55 bg-background/65 p-3 shadow-sm transition-all duration-300 hover:border-border hover:shadow-md dark:bg-card/60 sm:cursor-grab sm:active:cursor-grabbing"
                :class="[task.done ? 'opacity-70' : '', draggingId === task.id ? 'opacity-40' : '']"
                @dragstart="onDragStart(task, $event)"
                @dragend="onDragEnd"
              >
                <Checkbox class="rounded-lg" :model-value="task.done" :aria-label="`Concluir ${task.title}`" @update:model-value="toggleTask(task)" />

                <button
                  type="button"
                  class="grid h-5 w-5 shrink-0 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  :aria-label="`Prioridade ${priorityLabel(task.priority)}. Clique para alterar`"
                  :title="`Prioridade ${priorityLabel(task.priority)} (clique para alterar)`"
                  @click.stop="cyclePriority(task)"
                >
                  <span class="h-2 w-2 rounded-full" :class="task.done ? 'bg-muted-foreground/30' : PRIORITY_DOT[task.priority]" />
                </button>

                <Input
                  v-if="editingId === task.id"
                  id="calendar-edit-title"
                  v-model="editingTitle"
                  maxlength="200"
                  aria-label="Editar título da tarefa"
                  class="h-8 min-w-0 flex-1 rounded-xl px-2 text-sm"
                  @keydown.enter.prevent="commitEdit(task)"
                  @keydown.esc.prevent.stop="cancelEdit"
                  @blur="commitEdit(task)"
                />
                <button
                  v-else
                  type="button"
                  class="min-w-0 flex-1 truncate rounded-lg text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  :class="task.done ? 'text-muted-foreground line-through' : 'text-foreground'"
                  title="Clique para editar"
                  @click="startEdit(task)"
                >
                  {{ task.title }}
                </button>

                <Input
                  type="date"
                  class="h-8 w-[7.25rem] shrink-0 rounded-xl border-border/50 bg-background/70 px-1.5 text-[10px] shadow-none sm:px-2 sm:text-[11px]"
                  :aria-label="`Alterar prazo de ${task.title}`"
                  :model-value="normalizeDate(task.due_date)"
                  @update:model-value="(value) => reschedule(task, value)"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  class="h-8 w-8 shrink-0 rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
                  :aria-label="`Excluir ${task.title}`"
                  :disabled="deleteTask.isPending.value"
                  @click.stop="askDeleteTask(task)"
                >
                  <Trash2 class="h-4 w-4" />
                </Button>
              </li>
            </TransitionGroup>

            <div v-if="!tasksLoading && openOnSelectedDay.length > 1" class="flex justify-end">
              <Button type="button" variant="ghost" size="sm" class="h-8 rounded-xl px-3 text-xs" @click="completeSelectedDay">
                <CheckCheck class="h-3.5 w-3.5" /> Concluir todas ({{ openOnSelectedDay.length }})
              </Button>
            </div>
          </CardContent>
        </Card>

        <!-- Tarefas sem prazo -->
        <Card v-if="undatedTasks.length" class="calendar-surface min-w-0 overflow-hidden rounded-[2rem] border-border/60 py-0 shadow-sm">
          <CardHeader class="px-4 py-4">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <Inbox class="h-4 w-4 text-muted-foreground" />
                <CardTitle class="text-sm">Sem data</CardTitle>
              </div>
              <span class="text-xs tabular-nums text-muted-foreground">{{ undatedTasks.length }}</span>
            </div>
            <CardDescription>Defina um prazo ou arraste a tarefa até um dia do calendário.</CardDescription>
          </CardHeader>
          <CardContent class="max-h-72 space-y-2 overflow-y-auto px-4 pb-4">
            <div
              v-for="task in undatedTasks"
              :key="task.id"
              :draggable="editingId !== task.id"
              class="flex min-w-0 items-center gap-2 rounded-2xl border border-border/55 bg-background/60 p-2.5 sm:cursor-grab sm:active:cursor-grabbing"
              :class="draggingId === task.id ? 'opacity-40' : ''"
              @dragstart="onDragStart(task, $event)"
              @dragend="onDragEnd"
            >
              <Checkbox class="rounded-lg" :model-value="task.done" :aria-label="`Concluir ${task.title}`" @update:model-value="toggleTask(task)" />

              <button
                type="button"
                class="grid h-5 w-5 shrink-0 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                :aria-label="`Prioridade ${priorityLabel(task.priority)}. Clique para alterar`"
                :title="`Prioridade ${priorityLabel(task.priority)} (clique para alterar)`"
                @click.stop="cyclePriority(task)"
              >
                <span class="h-2 w-2 rounded-full" :class="task.done ? 'bg-muted-foreground/30' : PRIORITY_DOT[task.priority]" />
              </button>

              <Input
                v-if="editingId === task.id"
                id="calendar-edit-title"
                v-model="editingTitle"
                maxlength="200"
                aria-label="Editar título da tarefa"
                class="h-8 min-w-0 flex-1 rounded-xl px-2 text-xs"
                @keydown.enter.prevent="commitEdit(task)"
                @keydown.esc.prevent.stop="cancelEdit"
                @blur="commitEdit(task)"
              />
              <button
                v-else
                type="button"
                class="min-w-0 flex-1 truncate rounded-lg text-left text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                :class="task.done ? 'text-muted-foreground line-through' : ''"
                title="Clique para editar"
                @click="startEdit(task)"
              >
                {{ task.title }}
              </button>

              <Input
                type="date"
                class="h-8 w-[7.75rem] shrink-0 rounded-xl border-border/50 bg-background/70 px-2 text-[11px] shadow-none"
                :aria-label="`Definir prazo para ${task.title}`"
                :model-value="''"
                @update:model-value="(value) => reschedule(task, value)"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                class="h-8 w-8 shrink-0 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                :aria-label="`Excluir ${task.title}`"
                :disabled="deleteTask.isPending.value"
                @click.stop="askDeleteTask(task)"
              >
                <Trash2 class="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- Dialog compartilhado pelos cards de resumo -->
    <Dialog v-model:open="listDialogOpen">
      <DialogContent class="flex max-h-[85vh] flex-col rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{{ listDialogTitle }}</DialogTitle>
          <DialogDescription>{{ listDialogDescription }}</DialogDescription>
        </DialogHeader>

        <div class="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          <div v-if="!listDialogTasks.length" class="rounded-3xl border border-dashed border-border/70 bg-muted/15 px-4 py-7 text-center">
            <p class="text-sm font-medium">{{ listDialogEmpty }}</p>
          </div>

          <ul v-else class="space-y-2">
            <li
              v-for="task in listDialogTasks"
              :key="task.id"
              class="min-w-0 space-y-2 rounded-2xl border border-border/55 bg-background/65 p-3 shadow-sm"
            >
              <div class="flex min-w-0 items-center gap-2.5">
                <Checkbox class="rounded-lg" :model-value="task.done" :aria-label="`Concluir ${task.title}`" @update:model-value="toggleTask(task)" />
                <button
                  type="button"
                  class="grid h-5 w-5 shrink-0 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  :aria-label="`Prioridade ${priorityLabel(task.priority)}. Clique para alterar`"
                  :title="`Prioridade ${priorityLabel(task.priority)} (clique para alterar)`"
                  @click.stop="cyclePriority(task)"
                >
                  <span class="h-2 w-2 rounded-full" :class="task.done ? 'bg-muted-foreground/30' : PRIORITY_DOT[task.priority]" />
                </button>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm" :class="task.done ? 'text-muted-foreground line-through' : ''">{{ task.title }}</p>
                  <p class="text-[11px]" :class="listKind === 'overdue' ? 'text-rose-500' : 'text-muted-foreground'">
                    {{ taskDetail(task) }}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" class="h-8 shrink-0 rounded-xl px-2 text-xs" @click="goToDay(normalizeDate(task.due_date))">
                  Ver dia
                </Button>
              </div>

              <div v-if="listKind === 'overdue'" class="flex flex-wrap items-center gap-1.5 pl-7">
                <span class="text-[11px] text-muted-foreground">Reagendar:</span>
                <Button type="button" variant="outline" size="sm" class="h-7 rounded-xl px-2.5 text-xs" @click="reschedule(task, todayKey)">Hoje</Button>
                <Button type="button" variant="outline" size="sm" class="h-7 rounded-xl px-2.5 text-xs" @click="reschedule(task, tomorrowKey)">Amanhã</Button>
              </div>
            </li>
          </ul>
        </div>

        <DialogFooter v-if="listKind === 'overdue' && listDialogTasks.length > 1">
          <Button type="button" variant="outline" class="rounded-2xl" @click="moveAllOverdueToToday">
            Mover todas para hoje ({{ listDialogTasks.length }})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      v-model:open="deleteTaskOpen"
      title="Excluir tarefa?"
      :description="deleteTaskDescription"
      confirm-label="Excluir tarefa"
      destructive
      @confirm="confirmDeleteTask"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useEventListener } from '@vueuse/core';
import { toast } from 'vue-sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PRIORITY_DOT } from '@/lib/format';
import type { Task } from '@/lib/types';
import { useCreateTask, useDeleteTask, useTasks, useUpdateTask } from '@/queries/tasks';
import { useImportantDays, useSetImportantDay } from '@/queries/extra';
import ConfirmDialog from '@/components/dialogs/ConfirmDialog.vue';
import {
  ArrowRight,
  CalendarDays,
  CheckCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Download,
  Inbox,
  LoaderCircle,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-vue-next';

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

/* ---------- Prioridades ---------- */
type Priority = Task['priority'];
const PRIORITY_ORDER = ['alta', 'media', 'baixa'] as Priority[];
const PRIORITY_LABEL: Record<string, string> = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
const priorityLabel = (value: string) => PRIORITY_LABEL[value] ?? value;

/* ---------- Utilitários de data (horário local, ao meio-dia para evitar problemas de DST) ---------- */
const pad = (value: number) => String(value).padStart(2, '0');
const ymd = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const normalizeDate = (value: string | null | undefined) => (value ? value.slice(0, 10) : '');
const dateFromKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};
const addDaysKey = (key: string, delta: number) => {
  const d = dateFromKey(key);
  return ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta, 12, 0, 0, 0));
};
// Soma meses mantendo o dia, ou o último dia do mês de destino quando ele não existe
const addMonthsKey = (key: string, delta: number) => {
  const d = dateFromKey(key);
  const target = new Date(d.getFullYear(), d.getMonth() + delta, 1, 12, 0, 0, 0);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0, 12).getDate();
  return ymd(new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), lastDay), 12, 0, 0, 0));
};
const compareTasks = (a: Task, b: Task) =>
  Number(a.done) - Number(b.done) || a.title.localeCompare(b.title, 'pt-BR');
const compareByDueDate = (a: Task, b: Task) =>
  normalizeDate(a.due_date).localeCompare(normalizeDate(b.due_date)) ||
  a.title.localeCompare(b.title, 'pt-BR');
const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);
// Remove acentos e ignora maiúsculas, para a busca achar "reuniao" em "Reunião"
const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

function errMsg(error: unknown): string {
  return error instanceof Error ? error.message : 'Algo deu errado. Tente novamente.';
}

/* ---------- "Hoje" reativo: atualiza se a página ficar aberta após a meia-noite ---------- */
const today = ref(new Date());
const todayKey = computed(() => ymd(today.value));
const tomorrowKey = computed(() => addDaysKey(todayKey.value, 1));

function refreshToday(): void {
  const now = new Date();
  if (ymd(now) !== ymd(today.value)) today.value = now;
}

let refreshTimer: number | undefined;
onMounted(() => {
  refreshTimer = window.setInterval(refreshToday, 60_000);
  document.addEventListener('visibilitychange', refreshToday);
});
onUnmounted(() => {
  if (refreshTimer !== undefined) clearInterval(refreshTimer);
  document.removeEventListener('visibilitychange', refreshToday);
});

/* ---------- Estado da view ---------- */
const viewYear = ref(today.value.getFullYear());
const viewMonth = ref(today.value.getMonth()); // 0-11
const selectedDate = ref<string>(todayKey.value);
const draft = ref('');
const newPriority = ref<Priority>('media' as Priority);

/* ---------- Queries ---------- */
const { data, isPending: tasksPending, isError: tasksError, refetch: refetchTasks } = useTasks();
const updateTask = useUpdateTask();
const createTask = useCreateTask();
const deleteTask = useDeleteTask();
const importantQuery = useImportantDays();
const setImportant = useSetImportantDay();

const tasks = computed<Task[]>(() => data.value?.tasks ?? []);
const tasksLoading = computed(() => tasksPending.value);
const importantSet = computed(() => new Set(importantQuery.data.value?.days ?? []));

/* ---------- Busca e filtros ---------- */
type StatusFilter = 'all' | 'open' | 'done';
type PriorityFilter = 'all' | Priority;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'open', label: 'Abertas' },
  { value: 'done', label: 'Concluídas' },
];
const PRIORITY_FILTERS: { value: PriorityFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  ...PRIORITY_ORDER.map((p) => ({ value: p as PriorityFilter, label: priorityLabel(p) })),
];

const search = ref('');
const statusFilter = ref<StatusFilter>('all');
const priorityFilter = ref<PriorityFilter>('all');

const searchTerm = computed(() => fold(search.value.trim()));
const hasActiveFilters = computed(
  () => statusFilter.value !== 'all' || priorityFilter.value !== 'all' || searchTerm.value !== '',
);

const segClass = (active: boolean) =>
  active ? 'bg-background text-foreground shadow-sm hover:bg-background' : 'text-muted-foreground';

function matchesFilters(task: Task): boolean {
  if (statusFilter.value === 'open' && task.done) return false;
  if (statusFilter.value === 'done' && !task.done) return false;
  if (priorityFilter.value !== 'all' && task.priority !== priorityFilter.value) return false;
  return !searchTerm.value || fold(task.title).includes(searchTerm.value);
}

function clearFilters(): void {
  search.value = '';
  statusFilter.value = 'all';
  priorityFilter.value = 'all';
}

// Os cards de resumo e as listas dos dialogs usam todas as tarefas; só a grade e o dia usam os filtros.
const visibleTasks = computed(() => tasks.value.filter(matchesFilters));

/* ---------- Agrupamento das tarefas por data ---------- */
const tasksByDate = computed(() => {
  const map = new Map<string, Task[]>();
  for (const task of visibleTasks.value) {
    const key = normalizeDate(task.due_date);
    if (!key) continue;
    const list = map.get(key);
    if (list) list.push(task);
    else map.set(key, [task]);
  }
  for (const list of map.values()) list.sort(compareTasks);
  return map;
});
const tasksOn = (key: string): Task[] => tasksByDate.value.get(key) ?? [];

/* ---------- Mês exibido e direção da transição ---------- */
const monthDirection = ref<'next' | 'prev'>('next');
const monthKey = computed(() => `${viewYear.value}-${String(viewMonth.value + 1).padStart(2, '0')}`);
const monthTransitionName = computed(() => `calendar-month-${monthDirection.value}`);

const currentMonth = computed(() => new Date(viewYear.value, viewMonth.value, 1, 12, 0, 0, 0));
const monthLabel = computed(() =>
  currentMonth.value.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
);

const calendarDays = computed(() => {
  const first = currentMonth.value;
  const offsetFromMonday = (first.getDay() + 6) % 7;
  const firstCell = new Date(first.getFullYear(), first.getMonth(), 1 - offsetFromMonday, 12, 0, 0, 0);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0, 12).getDate();
  const totalCells = Math.ceil((offsetFromMonday + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const date = new Date(firstCell.getFullYear(), firstCell.getMonth(), firstCell.getDate() + index, 12, 0, 0, 0);
    const key = ymd(date);
    return {
      key,
      day: date.getDate(),
      month: date.toLocaleDateString('pt-BR', { month: 'long' }),
      weekday: date.toLocaleDateString('pt-BR', { weekday: 'long' }),
      isToday: key === todayKey.value,
      isCurrentMonth: date.getMonth() === first.getMonth() && date.getFullYear() === first.getFullYear(),
      important: importantSet.value.has(key),
      tasks: tasksOn(key),
    };
  });
});

// Só um dia da grade entra na ordem do Tab; as setas movem entre os demais
const focusableKey = computed(() =>
  calendarDays.value.some((d) => d.key === selectedDate.value)
    ? selectedDate.value
    : (calendarDays.value.find((d) => d.isCurrentMonth)?.key ?? ''),
);

/* ---------- Métricas do mês ---------- */
const monthStartKey = computed(() => ymd(currentMonth.value));
const monthEndKey = computed(() => ymd(new Date(viewYear.value, viewMonth.value + 1, 0, 12, 0, 0, 0)));

const monthTasks = computed(() =>
  tasks.value
    .filter((task) => {
      const due = normalizeDate(task.due_date);
      return due !== '' && due >= monthStartKey.value && due <= monthEndKey.value;
    })
    .sort(compareByDueDate),
);
const monthTaskCount = computed(() => monthTasks.value.length);
const monthOpenCount = computed(() => monthTasks.value.filter((task) => !task.done).length);

/* ---------- Tarefas atrasadas ---------- */
const overdueTasks = computed(() =>
  tasks.value
    .filter((task) => {
      const due = normalizeDate(task.due_date);
      return due !== '' && due < todayKey.value && !task.done;
    })
    .sort(compareByDueDate),
);
const overdueCount = computed(() => overdueTasks.value.length);

const formatDueDate = (value: string | null | undefined) =>
  dateFromKey(normalizeDate(value)).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });

const daysOverdue = (value: string | null | undefined) => {
  const diff = Math.round(
    (dateFromKey(todayKey.value).getTime() - dateFromKey(normalizeDate(value)).getTime()) / 86_400_000,
  );
  return diff === 1 ? '1 dia de atraso' : `${diff} dias de atraso`;
};

/* ---------- Cards de resumo ---------- */
const summaryCards = computed(() => [
  {
    kind: 'month' as const,
    label: 'Tarefas no mês',
    value: monthTaskCount.value,
    icon: CalendarDays,
    tone: 'bg-primary/10 text-primary',
    hover: 'hover:border-primary/40 hover:bg-primary/[0.03]',
  },
  {
    kind: 'open' as const,
    label: 'Em aberto no mês',
    value: monthOpenCount.value,
    icon: Clock3,
    tone: 'bg-amber-500/10 text-amber-600',
    hover: 'hover:border-amber-500/40 hover:bg-amber-500/[0.03]',
  },
  {
    kind: 'overdue' as const,
    label: 'Tarefas atrasadas',
    value: overdueCount.value,
    icon: CircleAlert,
    tone: 'bg-rose-500/10 text-rose-500',
    hover: 'hover:border-rose-500/40 hover:bg-rose-500/[0.03]',
  },
]);

/* ---------- Dialog de lista (compartilhado pelos cards) ---------- */
type ListKind = 'month' | 'open' | 'overdue';
const listKind = ref<ListKind | null>(null);

const listDialogOpen = computed({
  get: () => listKind.value !== null,
  set: (open: boolean) => {
    if (!open) listKind.value = null;
  },
});

const LIST_META: Record<ListKind, { title: string; suffix: string; empty: string }> = {
  month: {
    title: 'Tarefas no mês',
    suffix: 'com prazo neste mês, por data.',
    empty: 'Nenhuma tarefa neste mês',
  },
  open: {
    title: 'Em aberto no mês',
    suffix: 'em aberto neste mês, por data.',
    empty: 'Nenhuma tarefa em aberto neste mês',
  },
  overdue: {
    title: 'Tarefas atrasadas',
    suffix: 'com prazo vencido, da mais antiga para a mais recente.',
    empty: 'Nenhuma tarefa atrasada',
  },
};

const listDialogTasks = computed<Task[]>(() => {
  switch (listKind.value) {
    case 'month':
      return monthTasks.value;
    case 'open':
      return monthTasks.value.filter((task) => !task.done);
    case 'overdue':
      return overdueTasks.value;
    default:
      return [];
  }
});

const listDialogTitle = computed(() => (listKind.value ? LIST_META[listKind.value].title : ''));
const listDialogEmpty = computed(() => (listKind.value ? LIST_META[listKind.value].empty : ''));
const listDialogDescription = computed(() => {
  if (!listKind.value) return '';
  const count = listDialogTasks.value.length;
  return `${count} ${plural(count, 'tarefa', 'tarefas')} ${LIST_META[listKind.value].suffix}`;
});

const taskDetail = (task: Task) => {
  const date = formatDueDate(task.due_date);
  return listKind.value === 'overdue' ? `${date} · ${daysOverdue(task.due_date)}` : date;
};

function openList(kind: ListKind): void {
  listKind.value = kind;
}

/* ---------- Dia selecionado ---------- */
const selectedDateTasks = computed(() => tasksOn(selectedDate.value));
const openOnSelectedDay = computed(() => selectedDateTasks.value.filter((task) => !task.done));
const selectedDateLabel = computed(() =>
  dateFromKey(selectedDate.value).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }),
);
const isSelectedDateImportant = computed(() => importantSet.value.has(selectedDate.value));

const undatedTasks = computed(() =>
  visibleTasks.value.filter((task) => !normalizeDate(task.due_date)).sort(compareTasks),
);

/* ---------- Exclusão (com desfazer) ---------- */
const deleteTaskOpen = ref(false);
const taskToDelete = ref<Task | null>(null);
const deleteTaskDescription = computed(() =>
  taskToDelete.value
    ? `A tarefa "${taskToDelete.value.title}" será excluída permanentemente.`
    : 'Esta tarefa será excluída permanentemente.',
);

// Limpa a tarefa pendente sempre que o diálogo fechar (X, Esc, cancelar ou sucesso).
watch(deleteTaskOpen, (open) => {
  if (!open) taskToDelete.value = null;
});

type TaskSnapshot = { title: string; priority: Priority; due: string; projectId: number | null };

function restoreTask(snapshot: TaskSnapshot): void {
  createTask.mutate(
    {
      title: snapshot.title,
      priority: snapshot.priority,
      due_date: snapshot.due || null,
      ...(snapshot.projectId != null
        ? { project_id: snapshot.projectId }
        : {}),
    },
    {
      onSuccess: () => toast('Tarefa restaurada'),
      onError: (error) => toast.error(errMsg(error)),
    },
  );
}

function askDeleteTask(task: Task): void {
  taskToDelete.value = task;
  deleteTaskOpen.value = true;
}

function confirmDeleteTask(): void {
  const task = taskToDelete.value;
  if (!task || deleteTask.isPending.value) return;
  // Guardamos os dados antes de excluir, porque o diálogo limpa taskToDelete ao fechar
  const snapshot: TaskSnapshot = {
    title: task.title,
    priority: task.priority,
    due: normalizeDate(task.due_date),
    projectId: (task as Task & { project_id?: number | null }).project_id ?? null,
  };
  deleteTask.mutate(task.id, {
    onSuccess: () => {
      toast('Tarefa excluída', {
        duration: 6000,
        action: { label: 'Desfazer', onClick: () => restoreTask(snapshot) },
      });
      deleteTaskOpen.value = false;
    },
    onError: (error) => toast.error(errMsg(error)),
  });
}

/* ---------- Navegação ---------- */
function selectDate(key: string): void {
  const date = dateFromKey(key);
  const targetMonth = date.getFullYear() * 12 + date.getMonth();
  const visibleMonth = viewYear.value * 12 + viewMonth.value;

  if (targetMonth > visibleMonth) monthDirection.value = 'next';
  else if (targetMonth < visibleMonth) monthDirection.value = 'prev';

  selectedDate.value = key;
  viewYear.value = date.getFullYear();
  viewMonth.value = date.getMonth();
}

function shiftMonth(delta: number): void {
  // Navega apenas o mês exibido; a data selecionada não muda.
  if (delta !== 0) monthDirection.value = delta > 0 ? 'next' : 'prev';
  const target = new Date(viewYear.value, viewMonth.value + delta, 1, 12, 0, 0, 0);
  viewYear.value = target.getFullYear();
  viewMonth.value = target.getMonth();
}

function goToday(): void {
  today.value = new Date();
  const targetMonth = today.value.getFullYear() * 12 + today.value.getMonth();
  const visibleMonth = viewYear.value * 12 + viewMonth.value;
  if (targetMonth > visibleMonth) monthDirection.value = 'next';
  else if (targetMonth < visibleMonth) monthDirection.value = 'prev';

  viewYear.value = today.value.getFullYear();
  viewMonth.value = today.value.getMonth();
  selectedDate.value = todayKey.value;
}

function goToDay(key: string): void {
  listKind.value = null;
  selectDate(key);
}

/* ---------- Teclado ---------- */
function focusDay(key: string): void {
  document.querySelector<HTMLElement>(`[data-day="${key}"]`)?.focus();
}

// Setas e PageUp/PageDown só valem com o foco dentro da grade, para não bloquear a rolagem da página
async function onGridKeydown(event: KeyboardEvent): Promise<void> {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const base = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-day]')?.dataset.day;
  if (!base) return;

  const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
  let target: string | null = null;
  if (event.key in steps) target = addDaysKey(base, steps[event.key]);
  else if (event.key === 'PageUp') target = addMonthsKey(base, -1);
  else if (event.key === 'PageDown') target = addMonthsKey(base, 1);
  if (!target) return;

  event.preventDefault();
  selectDate(target);
  await nextTick();
  focusDay(target);
}

// Atalhos globais: T volta para hoje e N foca o campo de nova tarefa
useEventListener(window, 'keydown', (event: KeyboardEvent) => {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
  const el = event.target as HTMLElement | null;
  if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return;
  if (listDialogOpen.value || deleteTaskOpen.value) return;

  const key = event.key.toLowerCase();
  if (key === 't') {
    event.preventDefault();
    goToday();
  } else if (key === 'n') {
    event.preventDefault();
    document.getElementById('calendar-task-title')?.focus();
  }
});

/* ---------- Arrastar e soltar ---------- */
const draggingId = ref<Task['id'] | null>(null);
const dragOverKey = ref<string | null>(null);

function onDragStart(task: Task, event: DragEvent): void {
  draggingId.value = task.id;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(task.id));
  }
}

function onDragEnd(): void {
  draggingId.value = null;
  dragOverKey.value = null;
}

function onDayDragOver(key: string, event: DragEvent): void {
  if (draggingId.value === null) return;
  event.preventDefault(); // sem isso o navegador não permite soltar
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  dragOverKey.value = key;
}

function onDayDragLeave(event: DragEvent): void {
  const cell = event.currentTarget as HTMLElement;
  // Ignora o "leave" causado por entrar em um filho da própria célula
  if (!cell.contains(event.relatedTarget as Node | null)) dragOverKey.value = null;
}

function onDayDrop(key: string, event: DragEvent): void {
  event.preventDefault();
  const id = draggingId.value;
  onDragEnd();
  if (id === null) return;
  const task = tasks.value.find((item) => item.id === id);
  if (task) reschedule(task, key);
}

/* ---------- Edição do título no lugar ---------- */
const editingId = ref<Task['id'] | null>(null);
const editingTitle = ref('');

async function startEdit(task: Task): Promise<void> {
  editingId.value = task.id;
  editingTitle.value = task.title;
  await nextTick();
  const input = document.getElementById('calendar-edit-title') as HTMLInputElement | null;
  input?.focus();
  input?.select();
}

function cancelEdit(): void {
  editingId.value = null;
}

function commitEdit(task: Task): void {
  // Enter e blur disparam em sequência; só o primeiro conta
  if (editingId.value !== task.id) return;
  const title = editingTitle.value.trim();
  editingId.value = null;
  if (!title || title === task.title) return;
  updateTask.mutate(
    { id: task.id, body: { title } },
    { onError: (error) => toast.error(errMsg(error)) },
  );
}

/* ---------- Ações ---------- */
function toggleImportant(day: string): void {
  // Evita alternar com estado ainda não carregado (senão marca/desmarca o dia errado).
  if (!day || importantQuery.isPending.value || importantQuery.isError.value || setImportant.isPending.value) return;
  setImportant.mutate(
    { day, important: !importantSet.value.has(day) },
    { onError: (error) => toast.error(errMsg(error)) },
  );
}

function toggleTask(task: Task): void {
  updateTask.mutate(
    { id: task.id, body: { done: !task.done } },
    { onError: (error) => toast.error(errMsg(error)) },
  );
}

function cyclePriority(task: Task): void {
  const index = PRIORITY_ORDER.indexOf(task.priority);
  const next = PRIORITY_ORDER[(index + 1) % PRIORITY_ORDER.length];
  updateTask.mutate(
    { id: task.id, body: { priority: next } },
    {
      onSuccess: () => toast(`Prioridade: ${priorityLabel(next)}`),
      onError: (error) => toast.error(errMsg(error)),
    },
  );
}

function reschedule(task: Task, value: unknown): void {
  // Input type="date" emite string ('' quando limpo). Nunca converter null em "null".
  const nextDate = typeof value === 'string' && value ? value : null;
  if (normalizeDate(task.due_date) === (nextDate ?? '')) return;
  updateTask.mutate(
    { id: task.id, body: { due_date: nextDate } },
    {
      onSuccess: () => toast(nextDate ? 'Prazo atualizado' : 'Prazo removido'),
      onError: (error) => toast.error(errMsg(error)),
    },
  );
}

function completeSelectedDay(): void {
  const pending = [...openOnSelectedDay.value];
  if (!pending.length) return;
  for (const task of pending) {
    updateTask.mutate(
      { id: task.id, body: { done: true } },
      { onError: (error) => toast.error(errMsg(error)) },
    );
  }
  toast(`${pending.length} ${plural(pending.length, 'tarefa concluída', 'tarefas concluídas')}`);
}

function moveAllOverdueToToday(): void {
  const pending = [...overdueTasks.value];
  if (!pending.length) return;
  for (const task of pending) {
    updateTask.mutate(
      { id: task.id, body: { due_date: todayKey.value } },
      { onError: (error) => toast.error(errMsg(error)) },
    );
  }
  toast(`${pending.length} ${plural(pending.length, 'tarefa movida', 'tarefas movidas')} para hoje`);
}

function addTaskOnSelectedDate(): void {
  const title = draft.value.trim();
  const dueDate = selectedDate.value;
  if (!title || !dueDate || createTask.isPending.value) return;
  createTask.mutate(
    { title, priority: newPriority.value, due_date: dueDate },
    {
      onSuccess: () => {
        draft.value = '';
        toast('Tarefa adicionada ao calendário');
      },
      onError: (error) => toast.error(errMsg(error)),
    },
  );
}

/* ---------- Exportar o mês (.ics) ---------- */
const ICS_PRIORITY: Record<string, number> = { alta: 1, media: 5, baixa: 9 };

const icsText = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// O formato pede linhas de até 75 caracteres; as continuações começam com um espaço
function icsFold(line: string): string {
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    parts.push(rest.slice(0, 74));
    rest = ` ${rest.slice(74)}`;
  }
  parts.push(rest);
  return parts.join('\r\n');
}

function exportMonthIcs(): void {
  const list = monthTasks.value;
  if (!list.length) {
    toast('Nenhuma tarefa com prazo neste mês');
    return;
  }

  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//NT-life//Calendario//PT-BR', 'CALSCALE:GREGORIAN'];

  for (const task of list) {
    const start = normalizeDate(task.due_date);
    lines.push(
      'BEGIN:VEVENT',
      `UID:task-${task.id}@nt-life`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${start.replace(/-/g, '')}`,
      `DTEND;VALUE=DATE:${addDaysKey(start, 1).replace(/-/g, '')}`,
      `SUMMARY:${icsText(`${task.done ? '✓ ' : ''}${task.title}`)}`,
      `DESCRIPTION:${icsText(`Prioridade: ${priorityLabel(task.priority)}`)}`,
      `PRIORITY:${ICS_PRIORITY[task.priority] ?? 5}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');

  const blob = new Blob([`${lines.map(icsFold).join('\r\n')}\r\n`], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `tarefas-${monthStartKey.value.slice(0, 7)}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  toast(`${list.length} ${plural(list.length, 'tarefa exportada', 'tarefas exportadas')}`);
}
</script>

<style scoped>
/* Entrada sequenciada: conteúdo aparece com leveza, sem animações exageradas. */
.calendar-reveal {
  animation: calendar-reveal 540ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.calendar-reveal--header {
  animation-delay: 0ms;
}

.calendar-reveal--filters {
  animation-delay: 90ms;
}

.calendar-reveal--calendar {
  animation-delay: 130ms;
}

.calendar-reveal--details {
  animation-delay: 205ms;
}

.calendar-summary-card {
  transition:
    border-color 280ms ease,
    box-shadow 320ms cubic-bezier(0.22, 1, 0.36, 1),
    background-color 280ms ease,
    transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.calendar-summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px -20px hsl(var(--foreground) / 0.28);
}

.calendar-summary-card:active {
  transform: translateY(0) scale(0.995);
}

.calendar-surface {
  transition:
    border-color 280ms ease,
    box-shadow 320ms cubic-bezier(0.22, 1, 0.36, 1),
    background-color 280ms ease;
}

.calendar-glass-control {
  transition: border-color 300ms ease, background-color 300ms ease, box-shadow 350ms cubic-bezier(0.22, 1, 0.36, 1);
}

.calendar-glass-control:hover {
  border-color: hsl(var(--border) / 0.9);
  box-shadow: 0 8px 24px -18px hsl(var(--foreground) / 0.35);
}

/* Troca de mês: a direção acompanha os botões, o teclado e a seleção de dias adjacentes. */
.calendar-month-next-enter-active,
.calendar-month-next-leave-active,
.calendar-month-prev-enter-active,
.calendar-month-prev-leave-active {
  transition:
    opacity 220ms ease,
    transform 360ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 260ms ease;
}

.calendar-month-next-enter-from {
  opacity: 0;
  filter: blur(2px);
  transform: translateX(16px) scale(0.995);
}

.calendar-month-next-leave-to {
  opacity: 0;
  filter: blur(1px);
  transform: translateX(-12px) scale(0.995);
}

.calendar-month-prev-enter-from {
  opacity: 0;
  filter: blur(2px);
  transform: translateX(-16px) scale(0.995);
}

.calendar-month-prev-leave-to {
  opacity: 0;
  filter: blur(1px);
  transform: translateX(12px) scale(0.995);
}

.calendar-month-label-enter-active,
.calendar-month-label-leave-active,
.calendar-date-label-enter-active,
.calendar-date-label-leave-active,
.calendar-number-enter-active,
.calendar-number-leave-active {
  transition: opacity 180ms ease, transform 240ms cubic-bezier(0.22, 1, 0.36, 1);
}

.calendar-month-label-enter-from,
.calendar-date-label-enter-from,
.calendar-number-enter-from {
  opacity: 0;
  transform: translateY(5px);
}

.calendar-month-label-leave-to,
.calendar-date-label-leave-to,
.calendar-number-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.calendar-control-enter-active,
.calendar-control-leave-active {
  transition: opacity 180ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.calendar-control-enter-from,
.calendar-control-leave-to {
  opacity: 0;
  transform: translateY(4px) scale(0.97);
}

/* Chips dentro dos dias: entrada/saída e FLIP para mudanças de ordem. */
.calendar-task-chip-enter-active,
.calendar-task-chip-leave-active,
.calendar-task-chip-move {
  transition:
    opacity 200ms ease,
    transform 280ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 240ms ease;
}

.calendar-task-chip-enter-from {
  opacity: 0;
  filter: blur(1px);
  transform: translateY(5px) scale(0.98);
}

.calendar-task-chip-leave-to {
  opacity: 0;
  filter: blur(1px);
  transform: translateY(-3px) scale(0.98);
}

.calendar-task-chip-leave-active {
  position: absolute;
  right: 0;
  left: 0;
}

.calendar-day:active {
  transform: scale(0.985);
}

.calendar-task-enter-active,
.calendar-task-leave-active,
.calendar-task-move {
  transition:
    opacity 260ms ease,
    transform 320ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 280ms ease;
}

.calendar-task-enter-from {
  opacity: 0;
  filter: blur(1.5px);
  transform: translateY(7px);
}

.calendar-task-leave-to {
  opacity: 0;
  filter: blur(1px);
  transform: translateY(-3px) scale(0.99);
}

.calendar-task-leave-active {
  position: absolute;
  right: 0;
  left: 0;
}

@keyframes calendar-reveal {
  from {
    opacity: 0;
    filter: blur(2px);
    translate: 0 12px;
  }

  to {
    opacity: 1;
    filter: blur(0);
    translate: 0 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .calendar-page *,
  .calendar-page *::before,
  .calendar-page *::after {
    animation: none !important;
    transition: none !important;
    scroll-behavior: auto !important;
  }

  .calendar-page .calendar-summary-card:hover,
  .calendar-page .calendar-summary-card:active,
  .calendar-page .calendar-day:hover,
  .calendar-page .calendar-day:active {
    transform: none !important;
    translate: none !important;
  }
}
</style>
import {
    animate,
    query,
    stagger,
    style,
    transition,
    trigger,
} from '@angular/animations';
import { AsyncPipe, CommonModule, DatePipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { Color, NgxChartsModule, ScaleType } from '@swimlane/ngx-charts';
import { forkJoin, from, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Sale } from '../../../models/sale.model';
import { AppUser } from '../../../services/auth';
import { DatabaseService } from '../../../services/database.service';

// --- INTERFACES PARA ORGANIZAR OS DADOS ---
export interface KpiCard {
    title: string;
    value: string | number;
    subValue?: string;
    icon: string;
    color: string;
}

export interface ActivityItem {
    agentName: string;
    action: string;
    saleInfo: string;
    timestamp: Date;
    status: string;
}

export interface OverviewData {
    kpiCards: KpiCard[];
    salesByAgentChart: { name: string; value: number }[];
    activityFeed: ActivityItem[];
}

@Component({
    selector: 'app-overview',
    standalone: true,
    imports: [
        CommonModule,
        AsyncPipe,
        DatePipe,
        MatCardModule,
        MatIconModule,
        NgxChartsModule,
        MatListModule,
    ],
    templateUrl: './overview.html',
    styleUrl: './overview.scss',
    animations: [
        trigger('listAnimation', [
            transition('* => *', [
                query(
                    ':enter',
                    [
                        style({ opacity: 0, transform: 'translateY(20px)' }),
                        stagger(
                            '80ms',
                            animate(
                                '400ms ease-out',
                                style({
                                    opacity: 1,
                                    transform: 'translateY(0)',
                                })
                            )
                        ),
                    ],
                    { optional: true }
                ),
            ]),
        ]),
    ],
})
export class Overview implements OnInit {
    private dbService = inject(DatabaseService);

    public overviewData$: Observable<OverviewData | null> = of(null);

    public chartColorScheme: Color = {
        name: 'vivid',
        selectable: true,
        group: ScaleType.Ordinal,
        domain: [
            '#3b82f6',
            '#10b981',
            '#ef4444',
            '#f97316',
            '#8b5cf6',
            '#eab308',
        ],
    };

    ngOnInit(): void {
        this.overviewData$ = this.loadOverviewData();
    }

    private loadOverviewData(): Observable<OverviewData> {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;

        return forkJoin({
            pendingUsers: from(this.dbService.getPendingUsers()),
            agents: from(this.dbService.getAgents()),
            monthlySales: from(this.dbService.getAllSalesForMonth(year, month)),
            recentSales: from(this.dbService.getRecentSales(30)),
        }).pipe(
            map((result) => {
                const { pendingUsers, agents, monthlySales, recentSales } =
                    result;
                const agentsMap = new Map(agents.map((a) => [a.uid, a.name]));

                return {
                    kpiCards: this.calculateKpis(
                        pendingUsers,
                        agents,
                        monthlySales
                    ),
                    salesByAgentChart: this.getSalesByAgentChartData(
                        monthlySales.filter((s) => s.status === 'Instalada'),
                        agentsMap
                    ),
                    activityFeed: this.createActivityFeed(
                        recentSales,
                        agentsMap
                    ),
                };
            })
        );
    }

    // ===================================================================
    // FUNÇÃO ATUALIZADA
    // ===================================================================
    private calculateKpis(
        pendingUsers: AppUser[],
        agents: AppUser[],
        monthlySales: Sale[]
    ): KpiCard[] {
        // Filtra as vendas por status para o mês atual
        const installed = monthlySales.filter((s) => s.status === 'Instalada');
        const cancelled = monthlySales.filter((s) => s.status === 'Cancelada');
        const provisioning = monthlySales.filter((s) => s.status === 'Em Aprovisionamento');
        const pending = monthlySales.filter((s) => s.status === 'Pendência');

        // Calcula o Destaque do Mês
        const topAgent = this.calculateTopAgent(installed, agents);

        return [
            // CARD 1: Destaque do Mês
            {
                title: 'Destaque do Mês',
                value: topAgent.name,
                subValue: `${topAgent.sales} vendas instaladas`,
                icon: 'star',
                color: 'purple',
            },
            // CARD 2: Total Instaladas (Renomeado)
            {
                title: 'Total instaladas no mês atual',
                value: installed.length,
                subValue: '',
                icon: 'check_circle',
                color: 'green',
            },
            // CARD 3: Vendas Canceladas (Novo)
            {
                title: 'Vendas Canceladas',
                value: cancelled.length,
                subValue: 'No mês atual',
                icon: 'cancel',
                color: 'red',
            },
            // CARD 4: Em Aprovisionamento (Novo)
            {
                title: 'Em Aprovisionamento',
                value: provisioning.length,
                subValue: 'No mês atual',
                icon: 'hourglass_top',
                color: 'blue',
            },
            // CARD 5: Vendas com Pendência (Novo)
            {
                title: 'Vendas com Pendência',
                value: pending.length,
                subValue: 'No mês atual',
                icon: 'error',
                color: 'yellow',
            },
            // CARD 6: Agentes Ativos
            {
                title: 'Agentes Ativos',
                value: agents.length,
                subValue: '',
                icon: 'groups',
                color: 'blue',
            },
            // CARD 7: Solicitações Pendentes
            {
                title: 'Solicitações Pendentes',
                value: pendingUsers.length,
                subValue: '',
                icon: 'rule',
                color: 'orange',
            },
        ];
    }

    private calculateTopAgent(
        installedSales: Sale[],
        agents: AppUser[]
    ): { name: string; sales: number } {
        if (installedSales.length === 0)
            return { name: 'Ninguém ainda', sales: 0 };
        const salesByAgent = new Map<string, number>();
        installedSales.forEach((sale) =>
            salesByAgent.set(
                sale.agentUid,
                (salesByAgent.get(sale.agentUid) || 0) + 1
            )
        );
        if (salesByAgent.size === 0) return { name: 'Ninguém ainda', sales: 0 };
        const topEntry = [...salesByAgent.entries()].sort(
            (a, b) => b[1] - a[1]
        )[0];
        const topAgentInfo = agents.find((agent) => agent.uid === topEntry[0]);
        return {
            name: topAgentInfo?.name || 'Desconhecido',
            sales: topEntry[1],
        };
    }

    private getSalesByAgentChartData(
        installedSales: Sale[],
        agentsMap: Map<string, string>
    ): { name: string; value: number }[] {
        const salesByAgent = new Map<string, number>();
        installedSales.forEach((sale) =>
            salesByAgent.set(
                sale.agentUid,
                (salesByAgent.get(sale.agentUid) || 0) + 1
            )
        );
        return Array.from(salesByAgent, ([agentId, salesCount]) => ({
            name: agentsMap.get(agentId) || 'Desconhecido',
            value: salesCount,
        })).sort((a, b) => b.value - a.value);
    }

    private createActivityFeed(
        recentSales: Sale[],
        agentsMap: Map<string, string>
    ): ActivityItem[] {
        return recentSales.map((sale) => ({
            agentName: agentsMap.get(sale.agentUid) || 'Desconhecido',
            action: `registrou uma nova venda como "${sale.status}".`,
            saleInfo: `Ticket: ${sale.ticket || 'N/A'}`,
            timestamp: (sale.createdAt as any).toDate(),
            status: sale.status
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace('ç', 'c')
                .replace('ê', 'e'),
        }));
    }
}